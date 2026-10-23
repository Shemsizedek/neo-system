import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function registerFurnisher(input={}){
  if(!input.furnisher_id||!input.name)throw new TypeError('furnisher_id and name required')
  return {
    furnisher_id:String(input.furnisher_id),
    name:String(input.name),
    credential_status:input.credential_status||'UNVERIFIED',
    external_endpoint_ref:input.external_endpoint_ref||null,
    reporting_enabled:input.credential_status==='VERIFIED'&&Boolean(input.external_endpoint_ref),
    created_at:now()
  }
}

export function buildMetro2Record(tradeline={}){
  if(!tradeline.tradeline_id)throw new TypeError('tradeline_id required')
  return {
    tradeline_id:tradeline.tradeline_id,
    account_type:tradeline.account_type||'UNKNOWN',
    current_balance:Number(tradeline.current_balance||0),
    amount_past_due:Number(tradeline.past_due_amount||0),
    payment_status:tradeline.payment_status||'UNKNOWN',
    account_status:tradeline.status||'UNKNOWN',
    days_past_due:Number(tradeline.days_past_due||0),
    subject_id:tradeline.subject_id||null,
    creditor_ref:tradeline.creditor_ref||null
  }
}

export function validateMetro2Record(record={}){
  const errors=[]
  if(!record.tradeline_id)errors.push('tradeline_id_required')
  if(!record.account_type||record.account_type==='UNKNOWN')errors.push('account_type_required')
  if(!Number.isFinite(Number(record.current_balance)))errors.push('current_balance_invalid')
  if(!record.payment_status||record.payment_status==='UNKNOWN')errors.push('payment_status_required')
  if(!record.account_status||record.account_status==='UNKNOWN')errors.push('account_status_required')
  return {valid:errors.length===0,errors}
}

export function createReportingBatch({batch_id,furnisher,records=[],cycle_date}={}){
  if(!batch_id||!furnisher)throw new TypeError('batch_id and furnisher required')
  const rows=records.map(r=>({record:clone(r),validation:validateMetro2Record(r),suppressed:false,correction_of:null}))
  return {
    batch_id:String(batch_id),
    furnisher_id:furnisher.furnisher_id,
    cycle_date:cycle_date||now().slice(0,10),
    rows,
    state:'BUILT',
    external_transmission_enabled:furnisher.reporting_enabled===true,
    created_at:now()
  }
}

export function suppressTradeline(batch,{tradeline_id,reason}={}){
  const next=clone(batch),row=next.rows.find(x=>x.record.tradeline_id===tradeline_id)
  if(!row)throw new Error('tradeline_not_found')
  row.suppressed=true;row.suppression_reason=reason||'OPERATOR_SUPPRESSION';row.suppressed_at=now()
  return next
}

export function correctTradeline(batch,{tradeline_id,replacement}={}){
  const next=clone(batch),row=next.rows.find(x=>x.record.tradeline_id===tradeline_id)
  if(!row)throw new Error('tradeline_not_found')
  row.suppressed=true;row.suppression_reason='CORRECTED'
  next.rows.push({record:clone(replacement),validation:validateMetro2Record(replacement),suppressed:false,correction_of:tradeline_id,corrected_at:now()})
  return next
}

export function validateBatch(batch={}){
  const active=(batch.rows||[]).filter(r=>!r.suppressed)
  const errors=active.flatMap(r=>r.validation.valid?[]:[{tradeline_id:r.record.tradeline_id,errors:r.validation.errors}])
  return {valid:errors.length===0,errors,active_records:active.length,suppressed_records:(batch.rows||[]).filter(r=>r.suppressed).length}
}

export function authorizeTransmission(batch,{furnisher,approved=false}={}){
  const validation=validateBatch(batch)
  if(!validation.valid)return {...clone(batch),state:'VALIDATION_FAILED',validation}
  if(!approved)return {...clone(batch),state:'VALIDATED',validation}
  if(!furnisher?.reporting_enabled)return {...clone(batch),state:'BLOCKED_EXTERNAL_CREDENTIALS_REQUIRED',validation}
  return {...clone(batch),state:'AUTHORIZED_FOR_TRANSMISSION',validation,authorized_at:now()}
}

export function recordDelivery(batch,{delivery_receipt_id,endpoint_ref,verified=false}={}){
  if(batch?.state!=='AUTHORIZED_FOR_TRANSMISSION')throw new Error('authorized_batch_required')
  if(!verified||!delivery_receipt_id||!endpoint_ref)throw new TypeError('verified delivery receipt required')
  return {...clone(batch),state:'DELIVERED',delivery_receipt_id:String(delivery_receipt_id),endpoint_ref:String(endpoint_ref),delivered_at:now()}
}

export function createDisputeIntake(input={}){
  if(!input.dispute_id||!input.tradeline_id||!input.subject_id||!input.reason)throw new TypeError('dispute intake fields required')
  return {
    dispute_id:String(input.dispute_id),
    tradeline_id:String(input.tradeline_id),
    subject_id:String(input.subject_id),
    reason:String(input.reason),
    source:input.source||'INTERNAL',
    external_case_ref:input.external_case_ref||null,
    status:'OPEN',
    opened_at:now()
  }
}

export function createReportingAudit({event_type,entity_id,data={},previous_digest=null}={}){
  const e={audit_id:`CRA-${crypto.randomUUID()}`,event_type:String(event_type),entity_id:String(entity_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function reportingSnapshot({furnishers=[],batches=[],disputes=[],audit=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Reporting Gateway & Furnisher Operations',
    furnishers:{total:furnishers.length,verified:furnishers.filter(x=>x.credential_status==='VERIFIED').length,enabled:furnishers.filter(x=>x.reporting_enabled).length},
    batches:{total:batches.length,delivered:batches.filter(x=>x.state==='DELIVERED').length,blocked:batches.filter(x=>x.state==='BLOCKED_EXTERNAL_CREDENTIALS_REQUIRED').length},
    disputes:{total:disputes.length,open:disputes.filter(x=>x.status==='OPEN').length},
    audit:{events:audit.length},
    external_reporting_enabled:furnishers.some(x=>x.reporting_enabled),
    authority_boundary:'Gateway operation does not itself establish external furnisher or bureau authority.',
    generated_at:now()
  }
}
