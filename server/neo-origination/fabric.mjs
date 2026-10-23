import crypto from 'node:crypto'
const now=()=>new Date().toISOString(),clone=v=>structuredClone(v),sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function acceptOffer({offer,subject_id,accepted_at=now()}={}){
  if(!offer||!subject_id)throw new TypeError('offer and subject_id required')
  if(offer.status!=='OFFERED')throw new Error('offer_not_open')
  if(+new Date(accepted_at)>+new Date(offer.expires_at))throw new Error('offer_expired')
  return {acceptance_id:`ACC-${crypto.randomUUID()}`,offer_version_id:offer.offer_version_id||offer.offer_id,application_id:offer.application_id,subject_id:String(subject_id),accepted_at:new Date(accepted_at).toISOString(),status:'ACCEPTED'}
}

export function createDisclosurePackage(input={}){
  if(!input.disclosure_id||!input.application_id||!input.jurisdiction||!input.template_refs?.length)throw new TypeError('disclosure fields required')
  return {disclosure_id:String(input.disclosure_id),application_id:String(input.application_id),jurisdiction:String(input.jurisdiction),template_refs:[...input.template_refs],rendered_refs:[...(input.rendered_refs||[])],status:'PRESENTED',presented_at:now()}
}

export function acknowledgeDisclosure(disclosure,{subject_id,evidence_ref}={}){
  if(disclosure?.status!=='PRESENTED'||!subject_id||!evidence_ref)throw new TypeError('presented disclosure, subject and evidence required')
  return {...clone(disclosure),status:'ACKNOWLEDGED',subject_id:String(subject_id),acknowledgment_evidence_ref:String(evidence_ref),acknowledged_at:now()}
}

export function createAgreementVersion(input={}){
  if(!input.agreement_id||!input.application_id||!input.version||!input.terms)throw new TypeError('agreement fields required')
  const a={agreement_id:String(input.agreement_id),application_id:String(input.application_id),version:String(input.version),terms:clone(input.terms),jurisdiction:input.jurisdiction||'UNSPECIFIED',status:'DRAFT',created_at:now()}
  return {...a,terms_digest:sha(a.terms)}
}

export function finalizeAgreement(agreement,{disclosure,approved=true}={}){
  if(!approved)throw new Error('agreement_not_approved')
  if(disclosure?.status!=='ACKNOWLEDGED')throw new Error('acknowledged_disclosure_required')
  return {...clone(agreement),status:'READY_FOR_SIGNATURE',finalized_at:now(),disclosure_id:disclosure.disclosure_id}
}

export function createSignatureRequest(agreement,{request_id,signer_policy}={}){
  if(agreement?.status!=='READY_FOR_SIGNATURE')throw new Error('agreement_not_ready')
  if(!request_id||!signer_policy)throw new TypeError('signature request fields required')
  return {request_id:String(request_id),agreement_id:agreement.agreement_id,agreement_version:agreement.version,signer_policy:clone(signer_policy),state:'SIGNATURE_PENDING',private_keys_stored:false,created_at:now()}
}

export function recordSignature(request,{signature_ref,signer_ids=[]}={}){
  if(request?.state!=='SIGNATURE_PENDING'||!signature_ref||!signer_ids.length)throw new TypeError('signature evidence required')
  return {...clone(request),state:'SIGNED',signature_ref:String(signature_ref),signer_ids:[...signer_ids],signed_at:now()}
}

export function evaluateConditions({conditions=[]}={}){
  const rows=conditions.map(c=>({condition_id:c.condition_id,description:c.description||null,required:c.required!==false,satisfied:c.satisfied===true,evidence_refs:[...(c.evidence_refs||[])]}))
  const unsatisfied=rows.filter(r=>r.required&&!r.satisfied)
  return {ready:unsatisfied.length===0,conditions:rows,unsatisfied}
}

export function fundingReadiness({acceptance,disclosure,agreement,signature,conditions}={}){
  const reasons=[]
  if(acceptance?.status!=='ACCEPTED')reasons.push('offer_not_accepted')
  if(disclosure?.status!=='ACKNOWLEDGED')reasons.push('disclosure_not_acknowledged')
  if(agreement?.status!=='READY_FOR_SIGNATURE')reasons.push('agreement_not_finalized')
  if(signature?.state!=='SIGNED')reasons.push('agreement_not_signed')
  if(!conditions?.ready)reasons.push('conditions_precedent_unsatisfied')
  return {ready:reasons.length===0,reasons,funding_executed:false,generated_at:now()}
}

export function createOriginationEvidence({event_type,application_id,data={},previous_digest=null}={}){
  const e={evidence_id:`ORG-${crypto.randomUUID()}`,event_type:String(event_type),application_id:String(application_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function originationSnapshot({acceptances=[],disclosures=[],agreements=[],signatures=[],readiness=[],evidence=[]}={}){
  return {estate:'Global Vast Estate',fabric:'NEO Credit Origination & Contract Execution',acceptances:acceptances.length,disclosures:{total:disclosures.length,acknowledged:disclosures.filter(x=>x.status==='ACKNOWLEDGED').length},agreements:{total:agreements.length,ready:agreements.filter(x=>x.status==='READY_FOR_SIGNATURE').length},signatures:{total:signatures.length,signed:signatures.filter(x=>x.state==='SIGNED').length},funding_readiness:{total:readiness.length,ready:readiness.filter(x=>x.ready).length},evidence:{events:evidence.length},funding_executed:false,private_keys_stored:false,generated_at:now()}
}
