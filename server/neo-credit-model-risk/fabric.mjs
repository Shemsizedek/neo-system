import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function registerModel(input={}){
  if(!input.model_id||!input.name||!input.owner)throw new TypeError('model_id, name and owner required')
  return {
    model_id:String(input.model_id),
    name:String(input.name),
    owner:String(input.owner),
    purpose:input.purpose||'CREDIT_RATING',
    status:'DRAFT',
    active_version:null,
    created_at:now()
  }
}

export function createModelVersion(input={}){
  if(!input.model_id||!input.version||!input.specification)throw new TypeError('model_id, version and specification required')
  const record={
    model_id:String(input.model_id),
    version:String(input.version),
    specification:clone(input.specification),
    reason_codes:clone(input.reason_codes||[]),
    status:'VALIDATION_REQUIRED',
    created_at:now()
  }
  return {...record,specification_digest:sha(record.specification)}
}

export function validateModelVersion(version,{validation_id,tests=[],findings=[],approved=false,validator_id}={}){
  if(!validation_id||!validator_id)throw new TypeError('validation_id and validator_id required')
  const failed=tests.filter(t=>t.passed!==true)
  const validation={
    validation_id:String(validation_id),
    model_id:version.model_id,
    version:version.version,
    validator_id:String(validator_id),
    tests:clone(tests),
    findings:clone(findings),
    passed:failed.length===0&&approved===true,
    completed_at:now()
  }
  return {version:{...clone(version),status:validation.passed?'VALIDATED':'VALIDATION_FAILED'},validation}
}

export function backtestModel({model_id,version,predictions=[],outcomes=[]}={}){
  if(!model_id||!version)throw new TypeError('model_id and version required')
  if(predictions.length!==outcomes.length)throw new Error('prediction_outcome_length_mismatch')
  if(!predictions.length)return {model_id,version,available:false,reason:'no_backtest_data'}
  let abs=0,sq=0
  for(let i=0;i<predictions.length;i++){
    const e=Number(predictions[i])-Number(outcomes[i]);abs+=Math.abs(e);sq+=e*e
  }
  return {model_id,version,available:true,n:predictions.length,mae:abs/predictions.length,rmse:Math.sqrt(sq/predictions.length),generated_at:now()}
}

export function approveModelVersion(version,{approval_id,approver_id,approved=false,conditions=[]}={}){
  if(version?.status!=='VALIDATED')throw new Error('validated_model_required')
  if(!approval_id||!approver_id)throw new TypeError('approval_id and approver_id required')
  return {
    version:{...clone(version),status:approved?'APPROVED':'VALIDATED',approved_at:approved?now():null},
    approval:{approval_id:String(approval_id),model_id:version.model_id,version:version.version,approver_id:String(approver_id),approved:Boolean(approved),conditions:clone(conditions),recorded_at:now()}
  }
}

export function activateModel(model,version){
  if(version?.status!=='APPROVED')throw new Error('approved_model_required')
  return {...clone(model),status:'ACTIVE',active_version:version.version,activated_at:now()}
}

export function validateReasonCode(version,{code}={}){
  const hit=(version?.reason_codes||[]).find(r=>r.code===code)
  return {valid:Boolean(hit),reason:hit||null}
}

export function createOverride(input={}){
  if(!input.override_id||!input.model_id||!input.version||!input.actor_id||!input.reason||!(input.evidence_refs||[]).length)throw new TypeError('override fields and evidence required')
  return {
    override_id:String(input.override_id),
    model_id:String(input.model_id),
    version:String(input.version),
    actor_id:String(input.actor_id),
    reason:String(input.reason),
    evidence_refs:[...input.evidence_refs],
    from_value:input.from_value,
    to_value:input.to_value,
    status:'RECORDED',
    created_at:now()
  }
}

export function monitorDrift({model_id,version,baseline=[],current=[],threshold=0.1}={}){
  if(!baseline.length||!current.length)return {available:false,reason:'insufficient_monitoring_data'}
  const mean=a=>a.reduce((n,x)=>n+Number(x),0)/a.length
  const b=mean(baseline),c=mean(current)
  const denom=Math.max(Math.abs(b),1e-9)
  const relative=Math.abs(c-b)/denom
  return {available:true,model_id,version,baseline_mean:b,current_mean:c,relative_shift:relative,threshold:Number(threshold),drift_detected:relative>Number(threshold),generated_at:now()}
}

export function retireModel(model,version,{reason,actor_id}={}){
  if(!reason||!actor_id)throw new TypeError('retirement reason and actor required')
  return {
    model:{...clone(model),status:'RETIRED',retired_at:now()},
    version:{...clone(version),status:'RETIRED'},
    retirement:{reason:String(reason),actor_id:String(actor_id),recorded_at:now()}
  }
}

export function createModelEvidence({event_type,model_id,version,data={},previous_digest=null}={}){
  const e={evidence_id:`MRE-${crypto.randomUUID()}`,event_type:String(event_type),model_id:String(model_id),version:version||null,data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function modelRiskSnapshot({models=[],versions=[],validations=[],approvals=[],overrides=[],drift=[],evidence=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Governance & Model Risk Control',
    models:{total:models.length,active:models.filter(x=>x.status==='ACTIVE').length,retired:models.filter(x=>x.status==='RETIRED').length},
    versions:{total:versions.length,approved:versions.filter(x=>x.status==='APPROVED').length,failed:versions.filter(x=>x.status==='VALIDATION_FAILED').length},
    validations:validations.length,
    approvals:approvals.length,
    overrides:overrides.length,
    drift:{checks:drift.length,alerts:drift.filter(x=>x.drift_detected).length},
    evidence:{events:evidence.length},
    unapproved_model_use:false,
    generated_at:now()
  }
}
