import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createDrawRequest(input={}){
  if(!input.draw_id||!input.facility_id||!input.account_id)throw new TypeError('draw_id, facility_id and account_id required')
  const amount=Number(input.amount)
  if(!Number.isFinite(amount)||amount<=0)throw new Error('invalid_draw_amount')
  return {
    draw_id:String(input.draw_id),
    facility_id:String(input.facility_id),
    account_id:String(input.account_id),
    asset:String(input.asset||'NOMNI').toUpperCase(),
    amount,
    purpose:input.purpose||null,
    destination_ref:input.destination_ref||null,
    state:'REQUESTED',
    created_at:now()
  }
}

export function reserveCredit(draw,{approved_credit,existing_reserved=0}={}){
  const available=Number(approved_credit||0)-Number(existing_reserved||0)
  if(available<Number(draw.amount))return {...clone(draw),state:'REJECTED',reason:'insufficient_approved_credit'}
  return {...clone(draw),state:'RESERVED',reserved_amount:Number(draw.amount),reserved_at:now()}
}

export function authorizeFunding(draw,{approved=false,approver_id=null,policy_ref=null}={}){
  if(draw?.state!=='RESERVED')throw new Error('reserved_draw_required')
  return {
    ...clone(draw),
    state:approved?'AUTHORIZED':'RESERVED',
    approver_id:approved?approver_id:null,
    policy_ref:approved?policy_ref:null,
    authorized_at:approved?now():null
  }
}

export function createFundingInstruction(draw,{instruction_id,signer_policy,settlement_method='GATE122'}={}){
  if(draw?.state!=='AUTHORIZED')throw new Error('authorized_draw_required')
  if(!instruction_id||!signer_policy)throw new TypeError('instruction_id and signer_policy required')
  return {
    instruction_id:String(instruction_id),
    draw_id:draw.draw_id,
    facility_id:draw.facility_id,
    account_id:draw.account_id,
    asset:draw.asset,
    amount:draw.amount,
    destination_ref:draw.destination_ref,
    signer_policy:clone(signer_policy),
    settlement_method,
    private_keys_stored:false,
    state:'SIGNATURE_PENDING',
    created_at:now()
  }
}

export function recordFundingSignature(instruction,{signature_ref,signer_ids=[]}={}){
  if(instruction?.state!=='SIGNATURE_PENDING')throw new Error('signature_pending_required')
  if(!signature_ref||!Array.isArray(signer_ids)||!signer_ids.length)throw new TypeError('signature evidence required')
  return {...clone(instruction),state:'SIGNED',signature_ref:String(signature_ref),signer_ids:[...signer_ids],signed_at:now()}
}

export function submitFunding(instruction,{settlement_instruction_id}={}){
  if(instruction?.state!=='SIGNED')throw new Error('signed_instruction_required')
  if(!settlement_instruction_id)throw new TypeError('settlement_instruction_id required')
  return {...clone(instruction),state:'SUBMITTED',settlement_instruction_id:String(settlement_instruction_id),submitted_at:now()}
}

export function settleFunding(instruction,{settlement_evidence_ref,verified=false}={}){
  if(instruction?.state!=='SUBMITTED')throw new Error('submitted_instruction_required')
  if(!verified||!settlement_evidence_ref)return {...clone(instruction),state:'SUBMITTED'}
  return {...clone(instruction),state:'SETTLED',settlement_evidence_ref:String(settlement_evidence_ref),settled_at:now()}
}

export function createAdvanceLedgerEntry({facility_id,draw_id,asset,principal,rate_bps=0,settled_at}={}){
  if(!facility_id||!draw_id)throw new TypeError('facility_id and draw_id required')
  return {
    advance_id:`ADV-${crypto.randomUUID()}`,
    facility_id:String(facility_id),
    draw_id:String(draw_id),
    asset:String(asset||'NOMNI').toUpperCase(),
    original_principal:Number(principal||0),
    outstanding_principal:Number(principal||0),
    accrued_interest:0,
    rate_bps:Number(rate_bps||0),
    settled_at:settled_at||now(),
    status:'OUTSTANDING'
  }
}

export function accrueInterest(advance,{days}={}){
  const d=Math.max(0,Number(days||0))
  const interest=Number(advance.outstanding_principal)*Number(advance.rate_bps)/10000*d/365
  return {...clone(advance),accrued_interest:Number(advance.accrued_interest||0)+interest,last_accrual_at:now()}
}

export function createRepaymentSchedule({advance,start_date,payments=1,interval_days=30}={}){
  if(!advance?.advance_id)throw new TypeError('advance required')
  const count=Math.max(1,Math.floor(Number(payments||1)))
  const start=+new Date(start_date||now())
  const each=Number(advance.original_principal)/count
  return Array.from({length:count},(_,i)=>({
    repayment_id:`RPY-${advance.advance_id}-${String(i+1).padStart(3,'0')}`,
    advance_id:advance.advance_id,
    due_at:new Date(start+i*Number(interval_days||30)*86400000).toISOString(),
    principal_due:i===count-1?Number(advance.original_principal)-each*(count-1):each,
    state:'SCHEDULED'
  }))
}

export function recordRepayment(advance,{amount,evidence_ref,verified=false}={}){
  if(!verified||!evidence_ref)throw new Error('verified_repayment_evidence_required')
  const paid=Math.max(0,Number(amount||0))
  const outstanding=Math.max(0,Number(advance.outstanding_principal)-paid)
  return {...clone(advance),outstanding_principal:outstanding,status:outstanding===0?'REPAID':'OUTSTANDING',last_repayment_evidence_ref:String(evidence_ref),last_repayment_at:now()}
}

export function evaluateCollateralRelease({advance,required_collateral_value,eligible_collateral_value}={}){
  if(!advance)return {state:'BLOCKED',reason:'advance_missing'}
  if(Number(advance.outstanding_principal)>0)return {state:'BLOCKED',reason:'outstanding_principal'}
  if(Number(eligible_collateral_value)<Number(required_collateral_value||0))return {state:'BLOCKED',reason:'collateral_value_mismatch'}
  return {state:'ELIGIBLE',automatic_release:false}
}

export function createFundingEvidence({event_type,draw_id,data={},previous_digest=null}={}){
  const e={evidence_id:`FND-${crypto.randomUUID()}`,event_type:String(event_type),draw_id:String(draw_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function fundingSnapshot({draws=[],instructions=[],advances=[],repayments=[],evidence=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Institutional Funding & Credit Execution Fabric',
    draws:{total:draws.length,settled:draws.filter(x=>x.state==='SETTLED').length,pending:draws.filter(x=>!['SETTLED','REJECTED','CANCELLED'].includes(x.state)).length},
    instructions:{total:instructions.length,signed:instructions.filter(x=>['SIGNED','SUBMITTED','SETTLED'].includes(x.state)).length,settled:instructions.filter(x=>x.state==='SETTLED').length},
    advances:{total:advances.length,outstanding:advances.filter(x=>x.status==='OUTSTANDING').length,repaid:advances.filter(x=>x.status==='REPAID').length},
    repayments:{scheduled:repayments.length},
    evidence:{events:evidence.length},
    automatic_disbursement:false,
    automatic_collateral_release:false,
    private_keys_stored:false,
    generated_at:now()
  }
}
