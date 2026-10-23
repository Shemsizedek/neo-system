import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function detectDuplicateTradelines(tradelines=[]){
  const seen=new Map(),duplicates=[]
  for(const t of tradelines){
    const key=[t.subject_id,t.account_ref,t.creditor_ref,t.account_type].map(x=>String(x||'')).join('|')
    if(seen.has(key))duplicates.push({key,first:seen.get(key),duplicate:t.tradeline_id})
    else seen.set(key,t.tradeline_id)
  }
  return {duplicates,clean:duplicates.length===0}
}

export function matchIdentity({tradeline,account}={}){
  const reasons=[]
  if(!tradeline||!account)return {matched:false,reasons:['missing_record']}
  if(String(tradeline.subject_id||'')!==String(account.subject_id||account.institution_id||''))reasons.push('subject_mismatch')
  if(tradeline.account_ref&&String(tradeline.account_ref)!==String(account.account_id||''))reasons.push('account_ref_mismatch')
  return {matched:reasons.length===0,reasons}
}

export function reconcileBalance({tradelineBalance,servicingBalance,fundingBalance,tolerance=0.01}={}){
  const vals=[tradelineBalance,servicingBalance,fundingBalance].map(Number)
  if(vals.some(v=>!Number.isFinite(v)))return {matched:false,reason:'missing_or_invalid_balance'}
  const max=Math.max(...vals),min=Math.min(...vals),delta=max-min
  return {matched:delta<=Number(tolerance),delta,tolerance:Number(tolerance),values:{tradeline:vals[0],servicing:vals[1],funding:vals[2]}}
}

export function evaluateDisputeSla(disputes=[],{maxOpenDays=30,asOf=new Date()}={}){
  const breaches=[]
  for(const d of disputes){
    if(d.status!=='OPEN')continue
    const age=Math.max(0,Math.floor((+new Date(asOf)-+new Date(d.opened_at))/86400000))
    if(age>Number(maxOpenDays))breaches.push({dispute_id:d.dispute_id,age_days:age,limit_days:Number(maxOpenDays)})
  }
  return {breaches,within_sla:breaches.length===0}
}

export function evaluateCorrectionAging(corrections=[],{maxPendingDays=30,asOf=new Date()}={}){
  const stale=[]
  for(const c of corrections){
    if(c.status==='APPLIED'||c.status==='CLOSED')continue
    const age=Math.max(0,Math.floor((+new Date(asOf)-+new Date(c.created_at||c.corrected_at||now()))/86400000))
    if(age>Number(maxPendingDays))stale.push({correction_id:c.correction_id||c.tradeline_id,age_days:age,limit_days:Number(maxPendingDays)})
  }
  return {stale,within_limit:stale.length===0}
}

export function createException(input={}){
  if(!input.exception_type||!input.entity_id)throw new TypeError('exception_type and entity_id required')
  return {
    exception_id:input.exception_id||`EXC-${crypto.randomUUID()}`,
    exception_type:String(input.exception_type),
    entity_id:String(input.entity_id),
    severity:input.severity||'MATERIAL',
    details:clone(input.details||{}),
    status:'OPEN',
    created_at:now()
  }
}

export function resolveException(exception,{resolution,evidence_refs=[]}={}){
  if(exception?.status!=='OPEN')throw new Error('open_exception_required')
  if(!resolution)throw new TypeError('resolution required')
  return {...clone(exception),status:'RESOLVED',resolution:String(resolution),evidence_refs:[...evidence_refs],resolved_at:now()}
}

export function reconcileReportingCycle({tradelines=[],accounts=[],servicing=[],funding=[],disputes=[],corrections=[],tolerance=0.01,disputeMaxDays=30,correctionMaxDays=30}={}){
  const exceptions=[]
  const dup=detectDuplicateTradelines(tradelines)
  for(const d of dup.duplicates)exceptions.push(createException({exception_type:'DUPLICATE_TRADELINE',entity_id:d.duplicate,details:d}))
  for(const t of tradelines){
    const a=accounts.find(x=>String(x.account_id)===String(t.account_ref))
    const identity=matchIdentity({tradeline:t,account:a})
    if(!identity.matched)exceptions.push(createException({exception_type:'IDENTITY_OR_ACCOUNT_MISMATCH',entity_id:t.tradeline_id,details:identity}))
    const s=servicing.find(x=>String(x.account_id||x.servicing_id)===String(t.account_ref))
    const f=funding.find(x=>String(x.account_id||x.advance_id)===String(t.account_ref))
    if(s&&f){
      const bal=reconcileBalance({tradelineBalance:t.current_balance,servicingBalance:s.outstanding_principal,fundingBalance:f.outstanding_principal,tolerance})
      if(!bal.matched)exceptions.push(createException({exception_type:'BALANCE_MISMATCH',entity_id:t.tradeline_id,details:bal}))
    }
  }
  const dispute=evaluateDisputeSla(disputes,{maxOpenDays:disputeMaxDays})
  for(const d of dispute.breaches)exceptions.push(createException({exception_type:'DISPUTE_SLA_BREACH',entity_id:d.dispute_id,details:d}))
  const correction=evaluateCorrectionAging(corrections,{maxPendingDays:correctionMaxDays})
  for(const c of correction.stale)exceptions.push(createException({exception_type:'STALE_CORRECTION',entity_id:c.correction_id,details:c}))
  const material=exceptions.filter(x=>x.severity==='MATERIAL'&&x.status==='OPEN')
  return {
    cycle_id:`QA-${crypto.randomUUID()}`,
    tradelines:tradelines.length,
    exceptions,
    material_open:material.length,
    reporting_allowed:material.length===0,
    generated_at:now()
  }
}

export function createQaAudit({event_type,cycle_id,data={},previous_digest=null}={}){
  const e={audit_id:`QAA-${crypto.randomUUID()}`,event_type:String(event_type),cycle_id:String(cycle_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function reconciliationSnapshot({cycles=[],exceptions=[],audit=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Data Quality, Compliance & Reconciliation Engine',
    cycles:{total:cycles.length,blocked:cycles.filter(x=>!x.reporting_allowed).length,clear:cycles.filter(x=>x.reporting_allowed).length},
    exceptions:{total:exceptions.length,open:exceptions.filter(x=>x.status==='OPEN').length,resolved:exceptions.filter(x=>x.status==='RESOLVED').length},
    audit:{events:audit.length},
    reporting_block_policy:true,
    generated_at:now()
  }
}
