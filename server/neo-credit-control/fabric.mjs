import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createCreditFacility(input={}){
  if(!input.facility_id||!input.institution_id||!input.account_id)throw new TypeError('facility_id, institution_id and account_id required')
  const limit=Number(input.credit_limit||0)
  if(!Number.isFinite(limit)||limit<0)throw new Error('invalid_credit_limit')
  return {
    facility_id:String(input.facility_id),
    institution_id:String(input.institution_id),
    account_id:String(input.account_id),
    currency_or_asset:String(input.currency_or_asset||'NOMNI').toUpperCase(),
    credit_limit:limit,
    secured:input.secured!==false,
    margin_agreement_id:input.margin_agreement_id||null,
    status:'ACTIVE',
    execution_enabled:false,
    created_at:now()
  }
}

export function createHaircutSchedule(input={}){
  if(!input.schedule_id)throw new TypeError('schedule_id required')
  const rules=(input.rules||[]).map(r=>({asset:String(r.asset).toUpperCase(),haircut_bps:Number(r.haircut_bps||0),max_concentration:Number(r.max_concentration??1),eligible:r.eligible!==false}))
  for(const r of rules)if(r.haircut_bps<0||r.haircut_bps>10000||r.max_concentration<0||r.max_concentration>1)throw new Error('invalid_haircut_rule')
  return {schedule_id:String(input.schedule_id),rules,effective_at:input.effective_at||now(),status:'ACTIVE'}
}

export function createMarginAgreement(input={}){
  if(!input.agreement_id||!input.facility_id)throw new TypeError('agreement_id and facility_id required')
  return {
    agreement_id:String(input.agreement_id),
    facility_id:String(input.facility_id),
    initial_margin_bps:Number(input.initial_margin_bps||0),
    maintenance_margin_bps:Number(input.maintenance_margin_bps||0),
    minimum_transfer_amount:Number(input.minimum_transfer_amount||0),
    threshold:Number(input.threshold||0),
    call_frequency:input.call_frequency||'DAILY',
    status:'ACTIVE',
    created_at:now()
  }
}

export function evaluateCollateral({records=[],schedule}={}){
  if(!schedule)throw new TypeError('schedule required')
  const rules=new Map(schedule.rules.map(r=>[r.asset,r]))
  const eligible=[]
  let gross=0,total=0
  for(const c of records){
    const mv=Math.max(0,Number(c.market_value||0));gross+=mv
    const rule=rules.get(String(c.asset).toUpperCase())
    if(!rule||!rule.eligible){eligible.push({asset:c.asset,market_value:mv,eligible_value:0,reason:'ineligible'});continue}
    const ev=mv*(1-rule.haircut_bps/10000)
    eligible.push({asset:c.asset,market_value:mv,eligible_value:ev,haircut_bps:rule.haircut_bps,max_concentration:rule.max_concentration});total+=ev
  }
  return {gross_market_value:gross,eligible_value:total,records:eligible}
}

export function evaluateConcentration(collateralEvaluation={}){
  const total=Number(collateralEvaluation.eligible_value||0)
  const breaches=[]
  for(const r of collateralEvaluation.records||[]){
    if(!r.eligible_value)continue
    const share=total?r.eligible_value/total:0
    if(r.max_concentration!=null&&share>Number(r.max_concentration))breaches.push({asset:r.asset,share,limit:r.max_concentration})
  }
  return {breaches,within_limits:breaches.length===0}
}

export function calculateCreditUtilization({facility,outstanding=0,reserved=0,collateralEvaluation,agreement}={}){
  if(!facility)throw new TypeError('facility required')
  const used=Math.max(0,Number(outstanding))+Math.max(0,Number(reserved))
  const unsecuredCapacity=Math.max(0,facility.credit_limit-used)
  let securedCapacity=unsecuredCapacity
  if(facility.secured){
    if(!agreement||!collateralEvaluation)return {available:false,reason:'secured_credit_requires_margin_and_collateral'}
    const marginFactor=Math.max(0,1-Number(agreement.initial_margin_bps||0)/10000)
    securedCapacity=Math.max(0,Math.min(unsecuredCapacity,Number(collateralEvaluation.eligible_value||0)*marginFactor))
  }
  return {
    available:true,
    credit_limit:facility.credit_limit,
    outstanding:Number(outstanding||0),
    reserved:Number(reserved||0),
    utilization:facility.credit_limit?used/facility.credit_limit:0,
    available_credit:securedCapacity
  }
}

export function evaluateCreditRequest({facility,utilization,amount,concentration,accountStatus='ACTIVE'}={}){
  const reasons=[]
  const requested=Number(amount||0)
  if(accountStatus!=='ACTIVE')reasons.push('account_inactive')
  if(!facility||facility.status!=='ACTIVE')reasons.push('facility_inactive')
  if(!utilization?.available)reasons.push('credit_capacity_unknown')
  if(requested<=0)reasons.push('invalid_request_amount')
  if(utilization?.available&&requested>Number(utilization.available_credit))reasons.push('available_credit_exceeded')
  if(concentration&&!concentration.within_limits)reasons.push('collateral_concentration_breach')
  return {approved:reasons.length===0,reasons,requested_amount:requested,execution_enabled:false}
}

export function createFinancingTerms(input={}){
  if(!input.terms_id||!input.facility_id)throw new TypeError('terms_id and facility_id required')
  return {
    terms_id:String(input.terms_id),
    facility_id:String(input.facility_id),
    principal_limit:Number(input.principal_limit||0),
    rate_bps:Number(input.rate_bps||0),
    maturity_days:Number(input.maturity_days||0),
    payment_frequency:input.payment_frequency||'MONTHLY',
    collateral_required:input.collateral_required!==false,
    status:'TERMS_RECORDED_NOT_FUNDED',
    created_at:now()
  }
}

export function createCreditEvidence({event_type,facility_id,data={},previous_digest=null}={}){
  if(!event_type||!facility_id)throw new TypeError('event_type and facility_id required')
  const e={evidence_id:`CRE-${crypto.randomUUID()}`,event_type:String(event_type),facility_id:String(facility_id),data:clone(data),previous_digest,recorded_at:now()}
  return {...e,digest:sha(e)}
}

export function creditSnapshot({facilities=[],haircuts=[],agreements=[],terms=[],evidence=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Institutional Collateral, Credit & Financing Control',
    facilities:{total:facilities.length,active:facilities.filter(x=>x.status==='ACTIVE').length},
    haircut_schedules:haircuts.length,
    margin_agreements:agreements.length,
    financing_terms:{total:terms.length,funded:terms.filter(x=>x.status==='FUNDED').length},
    evidence:{events:evidence.length},
    execution_enabled:false,
    authority_boundary:'Internal/community credit control does not itself establish external lending, banking, broker-dealer, or securities-financing authority.',
    generated_at:now()
  }
}
