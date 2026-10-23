import crypto from 'node:crypto'
const now=()=>new Date().toISOString(),clone=v=>structuredClone(v),sha=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createProduct(input={}){
  if(!input.product_id||!input.name||!input.version)throw new TypeError('product_id, name and version required')
  return {product_id:String(input.product_id),name:String(input.name),version:String(input.version),asset:String(input.asset||'NOMNI').toUpperCase(),min_amount:Number(input.min_amount||0),max_amount:Number(input.max_amount||0),min_term_months:Number(input.min_term_months||1),max_term_months:Number(input.max_term_months||12),status:'DRAFT',created_at:now()}
}
export function createPricingPolicy(input={}){
  if(!input.policy_id||!input.product_id||!input.product_version)throw new TypeError('pricing policy fields required')
  return {policy_id:String(input.policy_id),product_id:String(input.product_id),product_version:String(input.product_version),base_rate_bps:Number(input.base_rate_bps||0),bands:clone(input.bands||[]),fees:clone(input.fees||[]),status:'ACTIVE',created_at:now()}
}
export function selectRiskBand(policy,{score}={}){
  const s=Number(score)
  const band=(policy.bands||[]).find(b=>s>=Number(b.min_score??-Infinity)&&s<=Number(b.max_score??Infinity))
  return band||null
}
export function priceOffer({product,policy,application,score}={}){
  if(!product||!policy||!application)throw new TypeError('product, policy and application required')
  const amount=Number(application.requested_amount||0),term=Number(application.term_months||0)
  const reasons=[]
  if(amount<product.min_amount||amount>product.max_amount)reasons.push('AMOUNT_OUT_OF_RANGE')
  if(term<product.min_term_months||term>product.max_term_months)reasons.push('TERM_OUT_OF_RANGE')
  const band=selectRiskBand(policy,{score})
  if(!band)reasons.push('NO_PRICING_BAND')
  const rate=band?Number(policy.base_rate_bps)+Number(band.spread_bps||0):null
  const fees=(policy.fees||[]).map(f=>({code:f.code,amount:f.type==='PERCENT'?amount*Number(f.value||0):Number(f.value||0)}))
  return {eligible:reasons.length===0,reasons,product_id:product.product_id,product_version:product.version,policy_id:policy.policy_id,risk_band:band?.name||null,rate_bps:rate,fees,total_fees:fees.reduce((n,f)=>n+f.amount,0),amount,term_months:term}
}
export function calculateEffectiveCost({principal,rate_bps,term_months,fees=0}={}){
  const p=Number(principal),r=Number(rate_bps)/10000/12,n=Math.max(1,Number(term_months||1)),f=Number(fees||0)
  if(!(p>0))throw new Error('invalid_principal')
  const payment=r===0?p/n:p*r/(1-(1+r)**(-n))
  const total=payment*n+f
  const simpleEffectiveRate=(total-p)/p
  return {monthly_payment:payment,total_cost:total,finance_cost:total-p,simple_effective_rate:simpleEffectiveRate,apr_status:'INTERNAL_ESTIMATE_ONLY'}
}
export function createOfferVersion({application_id,pricing,expires_at}={}){
  if(!application_id||!pricing?.eligible||!expires_at)throw new TypeError('eligible pricing and expiration required')
  const o={offer_version_id:`POF-${crypto.randomUUID()}`,application_id:String(application_id),pricing:clone(pricing),expires_at:new Date(expires_at).toISOString(),status:'OFFERED',created_at:now()}
  return {...o,digest:sha(o)}
}
export function createPricingOverride(input={}){
  if(!input.override_id||!input.offer_version_id||!input.actor_id||!input.reason||!(input.evidence_refs||[]).length)throw new TypeError('override fields and evidence required')
  return {override_id:String(input.override_id),offer_version_id:String(input.offer_version_id),actor_id:String(input.actor_id),reason:String(input.reason),changes:clone(input.changes||{}),evidence_refs:[...input.evidence_refs],status:'RECORDED',created_at:now()}
}
export function pricingSnapshot({products=[],policies=[],offers=[],overrides=[]}={}){
  return {estate:'Global Vast Estate',fabric:'NEO Credit Product & Pricing Engine',products:{total:products.length,active:products.filter(x=>x.status==='ACTIVE').length},policies:policies.length,offers:offers.length,overrides:overrides.length,jurisdiction_disclosure_verified:false,generated_at:now()}
}
