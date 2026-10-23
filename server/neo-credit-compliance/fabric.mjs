import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createCase(input={}){
  if(!input.case_id||!input.subject_id||!input.case_type)throw new TypeError('case_id, subject_id and case_type required')
  return {
    case_id:String(input.case_id),
    subject_id:String(input.subject_id),
    case_type:String(input.case_type),
    source_ref:input.source_ref||null,
    jurisdiction:input.jurisdiction||'UNSPECIFIED',
    severity:input.severity||'MATERIAL',
    status:'OPEN',
    opened_at:now(),
    assigned_to:input.assigned_to||null
  }
}

export function addCaseIssue(caseFile,input={}){
  if(!input.issue_id||!input.issue_type)throw new TypeError('issue_id and issue_type required')
  const issue={issue_id:String(input.issue_id),issue_type:String(input.issue_type),entity_ref:input.entity_ref||null,details:clone(input.details||{}),status:'OPEN',created_at:now()}
  return {...clone(caseFile),issues:[...(caseFile.issues||[]),issue]}
}

export function createDeadline({deadline_id,case_id,due_at,policy_ref,task}={}){
  if(!deadline_id||!case_id||!due_at||!policy_ref)throw new TypeError('deadline fields required')
  return {deadline_id:String(deadline_id),case_id:String(case_id),due_at:new Date(due_at).toISOString(),policy_ref:String(policy_ref),task:task||null,status:'OPEN',created_at:now()}
}

export function evaluateDeadline(deadline,{asOf=new Date()}={}){
  const overdue=deadline.status==='OPEN'&&+new Date(asOf)>+new Date(deadline.due_at)
  return {...clone(deadline),overdue,evaluated_at:now()}
}

export function addInvestigationStep(caseFile,{step_id,action,findings=null,evidence_refs=[]}={}){
  if(!step_id||!action)throw new TypeError('step_id and action required')
  const step={step_id:String(step_id),action:String(action),findings:findings||null,evidence_refs:[...evidence_refs],completed_at:now()}
  return {...clone(caseFile),investigation:[...(caseFile.investigation||[]),step],status:'UNDER_INVESTIGATION'}
}

export function createNotice(input={}){
  if(!input.notice_id||!input.case_id||!input.notice_type||!input.template_ref||!input.jurisdiction)throw new TypeError('notice fields required')
  return {
    notice_id:String(input.notice_id),
    case_id:String(input.case_id),
    notice_type:String(input.notice_type),
    jurisdiction:String(input.jurisdiction),
    template_ref:String(input.template_ref),
    reasons:clone(input.reasons||[]),
    rendered_content_ref:input.rendered_content_ref||null,
    status:'DRAFT',
    created_at:now()
  }
}

export function validateAdverseActionReasons(reasons=[]){
  const invalid=reasons.filter(r=>!r.code||!r.description||r.source==='MODEL_INFERENCE_ONLY')
  return {valid:invalid.length===0,invalid}
}

export function recordFurnisherResponse(input={}){
  if(!input.response_id||!input.case_id||!input.furnisher_id||!input.response_type)throw new TypeError('furnisher response fields required')
  return {response_id:String(input.response_id),case_id:String(input.case_id),furnisher_id:String(input.furnisher_id),response_type:String(input.response_type),evidence_refs:clone(input.evidence_refs||[]),received_at:input.received_at||now()}
}

export function createEvidencePackage({package_id,caseFile,documents=[],records=[],previous_digest=null}={}){
  if(!package_id||!caseFile)throw new TypeError('package_id and case required')
  const pkg={package_id:String(package_id),case_id:caseFile.case_id,documents:clone(documents),records:clone(records),previous_digest,created_at:now()}
  return {...pkg,digest:sha(pkg)}
}

export function resolveCase(caseFile,{resolution,resolution_code,evidence_refs=[],correction_required=false,notice_required=false}={}){
  if(!resolution||!resolution_code)throw new TypeError('resolution and resolution_code required')
  return {
    ...clone(caseFile),
    status:'RESOLVED',
    resolution:String(resolution),
    resolution_code:String(resolution_code),
    resolution_evidence_refs:[...evidence_refs],
    correction_required:Boolean(correction_required),
    notice_required:Boolean(notice_required),
    resolved_at:now()
  }
}

export function createCorrectionHandoff({caseFile,tradeline_id,patch,evidence_refs=[]}={}){
  if(caseFile?.status!=='RESOLVED'||!caseFile.correction_required)throw new Error('resolved_correction_case_required')
  if(!tradeline_id||!patch)throw new TypeError('tradeline_id and patch required')
  return {handoff_id:`COR-${crypto.randomUUID()}`,case_id:caseFile.case_id,tradeline_id:String(tradeline_id),patch:clone(patch),evidence_refs:[...evidence_refs],target:'GATE137',status:'READY',created_at:now()}
}

export function createAuditExport({caseFile,deadlines=[],notices=[],responses=[],evidencePackages=[]}={}){
  if(!caseFile)throw new TypeError('case required')
  const payload={case_file:clone(caseFile),deadlines:clone(deadlines),notices:clone(notices),furnisher_responses:clone(responses),evidence_packages:clone(evidencePackages),exported_at:now()}
  return {...payload,digest:sha(payload)}
}

export function complianceSnapshot({cases=[],deadlines=[],notices=[],responses=[],packages=[],handoffs=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Compliance Case Management & Regulatory Evidence',
    cases:{total:cases.length,open:cases.filter(x=>x.status!=='RESOLVED').length,resolved:cases.filter(x=>x.status==='RESOLVED').length},
    deadlines:{total:deadlines.length,overdue:deadlines.filter(x=>evaluateDeadline(x).overdue).length},
    notices:{total:notices.length,draft:notices.filter(x=>x.status==='DRAFT').length},
    furnisher_responses:responses.length,
    evidence_packages:packages.length,
    correction_handoffs:{total:handoffs.length,ready:handoffs.filter(x=>x.status==='READY').length},
    external_legal_determination:false,
    generated_at:now()
  }
}
