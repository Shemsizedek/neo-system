import crypto from 'node:crypto'
const now=()=>new Date().toISOString(),clone=v=>structuredClone(v),sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export const STATES=[
  'APPLICATION_SUBMITTED','UNDERWRITING_COMPLETE','PRICED','ORIGINATED','CREDIT_RESERVED',
  'FUNDING_AUTHORIZED','FUNDED','SERVICING_ACTIVE','CREDIT_RECORDED','REPORTING_READY',
  'REPORTING_BLOCKED','COMPLIANCE_CASE','CLOSED'
]
const allowed={
  APPLICATION_SUBMITTED:['UNDERWRITING_COMPLETE'],
  UNDERWRITING_COMPLETE:['PRICED'],
  PRICED:['ORIGINATED'],
  ORIGINATED:['CREDIT_RESERVED'],
  CREDIT_RESERVED:['FUNDING_AUTHORIZED'],
  FUNDING_AUTHORIZED:['FUNDED'],
  FUNDED:['SERVICING_ACTIVE'],
  SERVICING_ACTIVE:['CREDIT_RECORDED','CLOSED'],
  CREDIT_RECORDED:['REPORTING_READY','REPORTING_BLOCKED'],
  REPORTING_BLOCKED:['COMPLIANCE_CASE','REPORTING_READY'],
  COMPLIANCE_CASE:['REPORTING_READY','CLOSED'],
  REPORTING_READY:['CLOSED'],
  CLOSED:[]
}

export function createLifecycle(input={}){
  if(!input.lifecycle_id||!input.application_id||!input.subject_id)throw new TypeError('lifecycle_id, application_id and subject_id required')
  return {
    lifecycle_id:String(input.lifecycle_id),
    application_id:String(input.application_id),
    subject_id:String(input.subject_id),
    state:'APPLICATION_SUBMITTED',
    refs:{application_id:String(input.application_id)},
    created_at:now(),
    updated_at:now()
  }
}

export function canTransition(from,to){return (allowed[from]||[]).includes(to)}

export function transitionLifecycle(lifecycle,{to,event_id,evidence_ref,service_ref,data={}}={}){
  if(!to||!event_id||!evidence_ref||!service_ref)throw new TypeError('transition evidence required')
  if(!canTransition(lifecycle.state,to))throw new Error(`invalid_transition_${lifecycle.state}_to_${to}`)
  return {
    ...clone(lifecycle),
    state:to,
    refs:{...clone(lifecycle.refs),...clone(data.refs||{})},
    last_event_id:String(event_id),
    last_evidence_ref:String(evidence_ref),
    last_service_ref:String(service_ref),
    updated_at:now()
  }
}

export function createEvent(input={}){
  if(!input.event_id||!input.lifecycle_id||!input.event_type||!input.idempotency_key)throw new TypeError('event fields required')
  const e={
    event_id:String(input.event_id),
    lifecycle_id:String(input.lifecycle_id),
    event_type:String(input.event_type),
    idempotency_key:String(input.idempotency_key),
    source_service:input.source_service||null,
    evidence_ref:input.evidence_ref||null,
    payload:clone(input.payload||{}),
    occurred_at:input.occurred_at||now()
  }
  return {...e,digest:sha(e)}
}

export function applyIdempotentEvent({event,processedKeys=[]}={}){
  if(processedKeys.includes(event.idempotency_key))return {duplicate:true,accepted:false}
  return {duplicate:false,accepted:true}
}

export function createSaga(input={}){
  if(!input.saga_id||!input.lifecycle_id)throw new TypeError('saga_id and lifecycle_id required')
  return {
    saga_id:String(input.saga_id),
    lifecycle_id:String(input.lifecycle_id),
    status:'ACTIVE',
    steps:[],
    created_at:now()
  }
}

export function recordSagaStep(saga,{step_id,service,action,status,evidence_ref=null,error=null}={}){
  if(!step_id||!service||!action||!status)throw new TypeError('saga step fields required')
  const step={step_id:String(step_id),service:String(service),action:String(action),status:String(status),evidence_ref,error,recorded_at:now()}
  const steps=[...(saga.steps||[]),step]
  const failed=steps.some(x=>x.status==='FAILED')
  return {...clone(saga),steps,status:failed?'NEEDS_RECOVERY':'ACTIVE',updated_at:now()}
}

export function createRecoveryAction({saga,step_id,action,actor_id,evidence_refs=[]}={}){
  if(!saga||saga.status!=='NEEDS_RECOVERY')throw new Error('recovery_not_required')
  if(!step_id||!action||!actor_id)throw new TypeError('recovery fields required')
  return {
    recovery_id:`RCV-${crypto.randomUUID()}`,
    saga_id:saga.saga_id,
    step_id:String(step_id),
    action:String(action),
    actor_id:String(actor_id),
    evidence_refs:[...evidence_refs],
    status:'AUTHORIZED_MANUAL_RECOVERY',
    automatic_compensation:false,
    created_at:now()
  }
}

export function routeException({lifecycle,exception_type,source_ref,severity='MATERIAL'}={}){
  if(!lifecycle||!exception_type)throw new TypeError('lifecycle and exception_type required')
  return {
    route_id:`XRT-${crypto.randomUUID()}`,
    lifecycle_id:lifecycle.lifecycle_id,
    exception_type:String(exception_type),
    source_ref:source_ref||null,
    severity,
    target:severity==='MATERIAL'?'GATE139':'OPERATIONS_REVIEW',
    status:'ROUTED',
    created_at:now()
  }
}

export function createTimelineEntry({lifecycle_id,event_type,state,evidence_ref,service_ref,data={}}={}){
  if(!lifecycle_id||!event_type||!state)throw new TypeError('timeline fields required')
  const t={timeline_id:`TL-${crypto.randomUUID()}`,lifecycle_id:String(lifecycle_id),event_type:String(event_type),state:String(state),evidence_ref:evidence_ref||null,service_ref:service_ref||null,data:clone(data),recorded_at:now()}
  return {...t,digest:sha(t)}
}

export function lifecycleSnapshot({lifecycles=[],events=[],sagas=[],recoveries=[],routes=[],timeline=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Lifecycle Orchestrator',
    lifecycles:{total:lifecycles.length,closed:lifecycles.filter(x=>x.state==='CLOSED').length,blocked:lifecycles.filter(x=>x.state==='REPORTING_BLOCKED').length},
    events:{total:events.length},
    sagas:{total:sagas.length,recovery:sagas.filter(x=>x.status==='NEEDS_RECOVERY').length},
    recoveries:recoveries.length,
    exception_routes:routes.length,
    timeline:{entries:timeline.length},
    cross_service_bypass:false,
    automatic_compensation:false,
    generated_at:now()
  }
}
