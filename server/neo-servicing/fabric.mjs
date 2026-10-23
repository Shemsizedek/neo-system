import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createServicingAccount(input={}){
  if(!input.servicing_id||!input.advance_id||!input.facility_id)throw new TypeError('servicing_id, advance_id and facility_id required')
  return {
    servicing_id:String(input.servicing_id),
    advance_id:String(input.advance_id),
    facility_id:String(input.facility_id),
    account_id:input.account_id||null,
    asset:String(input.asset||'NOMNI').toUpperCase(),
    original_principal:Number(input.original_principal||0),
    outstanding_principal:Number(input.outstanding_principal??input.original_principal??0),
    accrued_interest:Number(input.accrued_interest||0),
    fees_due:Number(input.fees_due||0),
    next_due_at:input.next_due_at||null,
    days_past_due:Number(input.days_past_due||0),
    state:'CURRENT',
    created_at:now()
  }
}

export function createPaymentRecord(input={}){
  if(!input.payment_id||!input.servicing_id)throw new TypeError('payment_id and servicing_id required')
  const amount=Number(input.amount)
  if(!Number.isFinite(amount)||amount<=0)throw new Error('invalid_payment_amount')
  return {
    payment_id:String(input.payment_id),
    servicing_id:String(input.servicing_id),
    amount,
    asset:String(input.asset||'NOMNI').toUpperCase(),
    evidence_ref:input.evidence_ref||null,
    verified:input.verified===true,
    state:input.verified===true?'VERIFIED':'RECEIVED',
    received_at:input.received_at||now()
  }
}

export function allocatePayment(account,payment,{feesFirst=true}={}){
  if(payment?.state!=='VERIFIED'||!payment.evidence_ref)throw new Error('verified_payment_evidence_required')
  let remaining=Number(payment.amount)
  const allocation={fees:0,interest:0,principal:0,unapplied:0}
  if(feesFirst){allocation.fees=Math.min(remaining,Math.max(0,Number(account.fees_due||0)));remaining-=allocation.fees}
  allocation.interest=Math.min(remaining,Math.max(0,Number(account.accrued_interest||0)));remaining-=allocation.interest
  allocation.principal=Math.min(remaining,Math.max(0,Number(account.outstanding_principal||0)));remaining-=allocation.principal
  if(!feesFirst&&remaining>0){const fee=Math.min(remaining,Math.max(0,Number(account.fees_due||0)));allocation.fees+=fee;remaining-=fee}
  allocation.unapplied=remaining
  const next={
    ...clone(account),
    fees_due:Math.max(0,Number(account.fees_due||0)-allocation.fees),
    accrued_interest:Math.max(0,Number(account.accrued_interest||0)-allocation.interest),
    outstanding_principal:Math.max(0,Number(account.outstanding_principal||0)-allocation.principal),
    last_payment_at:now()
  }
  if(next.outstanding_principal===0&&next.accrued_interest===0&&next.fees_due===0)next.state='CLOSED'
  return {account:next,payment:{...clone(payment),state:'POSTED',allocation,posted_at:now()}}
}

export function evaluateDelinquency(account,{asOf=new Date(),graceDays=5,delinquentDays=30}={}){
  if(!account.next_due_at)return {...clone(account),state:account.state}
  const dpd=Math.max(0,Math.floor((+new Date(asOf)-+new Date(account.next_due_at))/86400000))
  let state='CURRENT'
  if(dpd>0&&dpd<=Number(graceDays))state='GRACE'
  else if(dpd>Number(graceDays))state='DELINQUENT'
  if(dpd>=Number(delinquentDays))state='DELINQUENT'
  return {...clone(account),days_past_due:dpd,state}
}

export function cureDelinquency(account,{verified=false,evidence_ref=null}={}){
  if(!verified||!evidence_ref)throw new Error('verified_cure_evidence_required')
  return {...clone(account),days_past_due:0,state:'CURED',cure_evidence_ref:String(evidence_ref),cured_at:now()}
}

export function createCovenant(input={}){
  if(!input.covenant_id||!input.servicing_id||!input.metric)throw new TypeError('covenant fields required')
  return {covenant_id:String(input.covenant_id),servicing_id:String(input.servicing_id),metric:String(input.metric),operator:input.operator||'>=',threshold:Number(input.threshold||0),state:'COMPLIANT',created_at:now()}
}

export function evaluateCovenant(covenant,{value}={}){
  const v=Number(value),t=Number(covenant.threshold)
  const ok=covenant.operator==='>='?v>=t:covenant.operator==='<='?v<=t:covenant.operator==='>'?v>t:v<t
  return {...clone(covenant),observed_value:v,state:ok?'COMPLIANT':'BREACH',evaluated_at:now()}
}

export function createRestructuring(input={}){
  if(!input.restructuring_id||!input.servicing_id||!input.terms)throw new TypeError('restructuring fields required')
  return {restructuring_id:String(input.restructuring_id),servicing_id:String(input.servicing_id),terms:clone(input.terms),approved:input.approved===true,status:input.approved===true?'RESTRUCTURED':'PROPOSED',created_at:now()}
}

export function recordDefaultEvent(input={}){
  if(!input.default_id||!input.servicing_id||!input.policy_ref||!input.evidence_ref)throw new TypeError('default policy and evidence required')
  return {default_id:String(input.default_id),servicing_id:String(input.servicing_id),policy_ref:String(input.policy_ref),evidence_ref:String(input.evidence_ref),reason:input.reason||null,status:'DEFAULT_RECORDED',recorded_at:now(),external_enforcement:false}
}

export function createRecoveryRecord(input={}){
  if(!input.recovery_id||!input.servicing_id)throw new TypeError('recovery fields required')
  return {recovery_id:String(input.recovery_id),servicing_id:String(input.servicing_id),amount:Number(input.amount||0),evidence_ref:input.evidence_ref||null,status:Number(input.amount||0)>0?'PARTIAL':'OPEN',external_enforcement:false,created_at:now()}
}

export function performanceSnapshot(account,{payments=[],defaults=[],restructurings=[]}={}){
  return {
    servicing_id:account.servicing_id,
    advance_id:account.advance_id,
    state:account.state,
    outstanding_principal:account.outstanding_principal,
    accrued_interest:account.accrued_interest,
    days_past_due:account.days_past_due,
    posted_payments:payments.filter(x=>x.state==='POSTED').length,
    defaults:defaults.length,
    restructurings:restructurings.filter(x=>x.status==='RESTRUCTURED').length,
    proof_of_payment_ready:payments.some(x=>x.state==='POSTED'&&x.evidence_ref),
    metro2_mapping_status:'ADAPTER_REQUIRED'
  }
}

export function createServicingEvidence({event_type,servicing_id,data={},previous_digest=null}={}){
  const e={evidence_id:`SVC-${crypto.randomUUID()}`,event_type:String(event_type),servicing_id:String(servicing_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function servicingSnapshot({accounts=[],payments=[],covenants=[],restructurings=[],defaults=[],recoveries=[],evidence=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Institutional Servicing & Credit Performance',
    accounts:{total:accounts.length,current:accounts.filter(x=>x.state==='CURRENT').length,delinquent:accounts.filter(x=>x.state==='DELINQUENT').length,closed:accounts.filter(x=>x.state==='CLOSED').length},
    payments:{total:payments.length,posted:payments.filter(x=>x.state==='POSTED').length},
    covenants:{total:covenants.length,breaches:covenants.filter(x=>x.state==='BREACH').length},
    restructurings:{total:restructurings.length},
    defaults:{total:defaults.length},
    recoveries:{total:recoveries.length},
    evidence:{events:evidence.length},
    external_enforcement:false,
    generated_at:now()
  }
}
