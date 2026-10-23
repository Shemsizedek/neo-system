import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createApplication(input={}){
  if(!input.application_id||!input.subject_id||!input.product_id)throw new TypeError('application_id, subject_id and product_id required')
  return {
    application_id:String(input.application_id),
    subject_id:String(input.subject_id),
    product_id:String(input.product_id),
    requested_amount:Number(input.requested_amount||0),
    term_months:Number(input.term_months||0),
    stated_income:input.stated_income==null?null:Number(input.stated_income),
    verified_income:input.verified_income==null?null:Number(input.verified_income),
    monthly_obligations:Number(input.monthly_obligations||0),
    collateral_value:input.collateral_value==null?null:Number(input.collateral_value),
    data_verified:input.data_verified===true,
    status:'SUBMITTED',
    submitted_at:now()
  }
}

export function evaluateEligibility(application,{rules=[]}={}){
  const reasons=[]
  for(const r of rules){
    const value=application[r.field]
    const n=Number(value)
    let pass=true
    if(r.operator==='>=')pass=n>=Number(r.value)
    else if(r.operator==='<=')pass=n<=Number(r.value)
    else if(r.operator==='>')pass=n>Number(r.value)
    else if(r.operator==='<')pass=n<Number(r.value)
    else if(r.operator==='==')pass=String(value)===String(r.value)
    if(!pass)reasons.push(r.reason_code||`ELIGIBILITY_${r.field}`)
  }
  return {eligible:reasons.length===0,reasons}
}

export function calculateCapacity(application,{max_dti=0.43,monthly_rate=0,term_months}={}){
  const income=Number(application.verified_income)
  if(!application.data_verified||!Number.isFinite(income)||income<=0)return {available:false,reason:'verified_income_required'}
  const monthlyIncome=income/12
  const obligations=Math.max(0,Number(application.monthly_obligations||0))
  const maxPayment=Math.max(0,monthlyIncome*Number(max_dti)-obligations)
  const n=Math.max(1,Number(term_months||application.term_months||12))
  const r=Math.max(0,Number(monthly_rate||0))
  const principal=r===0?maxPayment*n:maxPayment*(1-(1+r)**(-n))/r
  return {available:true,monthly_income:monthlyIncome,max_payment:maxPayment,max_principal:principal,max_dti:Number(max_dti)}
}

export function invokeApprovedModel({model,version,features={},scorer}={}){
  if(model?.status!=='ACTIVE'||version?.status!=='APPROVED'||model.active_version!==version.version)throw new Error('approved_active_model_required')
  if(typeof scorer!=='function')throw new TypeError('scorer required')
  const result=scorer(clone(features))
  return {model_id:model.model_id,version:version.version,result:clone(result),invoked_at:now(),decision_authority:false}
}

export function evaluateCreditPolicy({application,eligibility,capacity,modelResult,policy={}}={}){
  const reasons=[]
  if(!application?.data_verified)reasons.push('INPUT_DATA_NOT_VERIFIED')
  if(!eligibility?.eligible)reasons.push(...(eligibility?.reasons||[]))
  if(!capacity?.available)reasons.push('CAPACITY_UNAVAILABLE')
  if(capacity?.available&&Number(application.requested_amount)>Number(capacity.max_principal))reasons.push('REQUEST_EXCEEDS_CAPACITY')
  if(policy.min_model_score!=null&&Number(modelResult?.result?.score)<Number(policy.min_model_score))reasons.push(policy.low_score_reason_code||'MODEL_SCORE_BELOW_POLICY')
  if(policy.max_requested_amount!=null&&Number(application.requested_amount)>Number(policy.max_requested_amount))reasons.push('PRODUCT_AMOUNT_LIMIT')
  return {decision:reasons.length===0?'APPROVE':'REVIEW_OR_DECLINE',reasons,policy_ref:policy.policy_ref||null}
}

export function createManualReview({application_id,reason_codes=[],reviewer_id=null}={}){
  if(!application_id||!reason_codes.length)throw new TypeError('application_id and reason_codes required')
  return {review_id:`REV-${crypto.randomUUID()}`,application_id:String(application_id),reason_codes:[...reason_codes],reviewer_id,status:'PENDING',created_at:now()}
}

export function resolveManualReview(review,{outcome,reviewer_id,evidence_refs=[]}={}){
  if(review?.status!=='PENDING')throw new Error('pending_review_required')
  if(!['APPROVE','DECLINE','RETURN'].includes(String(outcome)))throw new Error('invalid_review_outcome')
  if(!reviewer_id)throw new TypeError('reviewer_id required')
  return {...clone(review),status:'RESOLVED',outcome:String(outcome),reviewer_id:String(reviewer_id),evidence_refs:[...evidence_refs],resolved_at:now()}
}

export function createOffer({application,decision,terms={},expires_at}={}){
  if(decision?.decision!=='APPROVE')throw new Error('approved_decision_required')
  if(!expires_at)throw new TypeError('expires_at required')
  return {
    offer_id:`OFF-${crypto.randomUUID()}`,
    application_id:application.application_id,
    amount:Number(terms.amount??application.requested_amount),
    rate_bps:Number(terms.rate_bps||0),
    term_months:Number(terms.term_months??application.term_months),
    payment_frequency:terms.payment_frequency||'MONTHLY',
    collateral_required:terms.collateral_required===true,
    expires_at:new Date(expires_at).toISOString(),
    status:'OFFERED',
    funding_enabled:false,
    created_at:now()
  }
}

export function evaluateOfferExpiration(offer,{asOf=new Date()}={}){
  const expired=+new Date(asOf)>+new Date(offer.expires_at)
  return {...clone(offer),expired,status:expired&&offer.status==='OFFERED'?'EXPIRED':offer.status}
}

export function createDecisionRecord({application,eligibility,capacity,modelInvocation,policyDecision,manualReview=null}={}){
  if(!application||!policyDecision)throw new TypeError('application and policy decision required')
  const record={
    decision_id:`DEC-${crypto.randomUUID()}`,
    application_id:application.application_id,
    eligibility:clone(eligibility),
    capacity:clone(capacity),
    model_invocation:clone(modelInvocation),
    policy_decision:clone(policyDecision),
    manual_review:manualReview?clone(manualReview):null,
    recorded_at:now()
  }
  return {...record,digest:sha(record)}
}

export function underwritingSnapshot({applications=[],decisions=[],reviews=[],offers=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Credit Decision Engine & Underwriting Policy',
    applications:{total:applications.length,submitted:applications.filter(x=>x.status==='SUBMITTED').length},
    decisions:{total:decisions.length,approved:decisions.filter(x=>x.policy_decision?.decision==='APPROVE').length},
    reviews:{total:reviews.length,pending:reviews.filter(x=>x.status==='PENDING').length},
    offers:{total:offers.length,active:offers.filter(x=>!evaluateOfferExpiration(x).expired&&x.status==='OFFERED').length},
    automatic_funding:false,
    model_output_decision_authority:false,
    generated_at:now()
  }
}
