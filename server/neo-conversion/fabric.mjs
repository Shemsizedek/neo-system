import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)

export function normalizeQuote(input={}){
  if(!input.source_id||!input.base_asset||!input.quote_asset)throw new TypeError('source_id, base_asset and quote_asset required')
  const price=Number(input.price)
  if(!Number.isFinite(price)||price<=0)throw new Error('invalid_quote_price')
  return {
    quote_id:input.quote_id||`Q-${crypto.randomUUID()}`,
    source_id:String(input.source_id),
    venue_id:input.venue_id||null,
    base_asset:String(input.base_asset).toUpperCase(),
    quote_asset:String(input.quote_asset).toUpperCase(),
    price,
    bid:input.bid==null?null:Number(input.bid),
    ask:input.ask==null?null:Number(input.ask),
    observed_at:input.observed_at||now(),
    expires_at:input.expires_at||null,
    executable:input.executable===true,
    source_type:input.source_type||'REFERENCE',
    evidence_ref:input.evidence_ref||null
  }
}

function median(v){const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}

export function buildVerifiedReference({quotes=[],baseAsset,quoteAsset,maxAgeMs=120000,at=new Date()}={}){
  const nowMs=+new Date(at)
  const valid=quotes.filter(q=>q.base_asset===String(baseAsset).toUpperCase()&&q.quote_asset===String(quoteAsset).toUpperCase()).filter(q=>{
    const age=nowMs-+new Date(q.observed_at)
    return age>=0&&age<=Number(maxAgeMs)&&Number.isFinite(q.price)&&q.price>0&&q.source_id
  })
  if(!valid.length)return {available:false,reason:'no_fresh_explicit_quotes'}
  return {
    available:true,
    base_asset:String(baseAsset).toUpperCase(),
    quote_asset:String(quoteAsset).toUpperCase(),
    price:median(valid.map(x=>x.price)),
    sample_size:valid.length,
    source_ids:valid.map(x=>x.source_id),
    quote_ids:valid.map(x=>x.quote_id),
    observed_at:new Date(Math.max(...valid.map(x=>+new Date(x.observed_at)))).toISOString(),
    methodology:'median_of_fresh_explicit_quotes'
  }
}

export function evaluateRoute({reference,offer,maxSpreadBps=150,maxSlippageBps=100}={}){
  if(!reference?.available||!offer) return {eligible:false,reason:'missing_reference_or_offer'}
  const px=Number(offer.price)
  if(!Number.isFinite(px)||px<=0)return {eligible:false,reason:'invalid_offer_price'}
  const spreadBps=Math.abs((px-reference.price)/reference.price)*10000
  const expected=Number(offer.expected_execution_price??px)
  const slippageBps=Math.abs((expected-px)/px)*10000
  const selfTrade=Boolean(offer.self_trade)||Boolean(offer.buyer_id&&offer.seller_id&&offer.buyer_id===offer.seller_id)
  if(selfTrade)return {eligible:false,reason:'self_trade_prohibited',spread_bps:spreadBps,slippage_bps:slippageBps}
  if(spreadBps>Number(maxSpreadBps))return {eligible:false,reason:'spread_limit_exceeded',spread_bps:spreadBps,slippage_bps:slippageBps}
  if(slippageBps>Number(maxSlippageBps))return {eligible:false,reason:'slippage_limit_exceeded',spread_bps:spreadBps,slippage_bps:slippageBps}
  if(offer.authorized!==true)return {eligible:false,reason:'venue_or_route_not_authorized',spread_bps:spreadBps,slippage_bps:slippageBps}
  if(offer.executable!==true)return {eligible:false,reason:'execution_adapter_unavailable',spread_bps:spreadBps,slippage_bps:slippageBps}
  return {eligible:true,reason:'route_eligible',spread_bps:spreadBps,slippage_bps:slippageBps}
}

export function chooseLiquidityRoute({reference,offers=[],maxSpreadBps=150,maxSlippageBps=100}={}){
  const evaluated=offers.map(o=>({offer:o,evaluation:evaluateRoute({reference,offer:o,maxSpreadBps,maxSlippageBps})}))
  const eligible=evaluated.filter(x=>x.evaluation.eligible).sort((a,b)=>a.evaluation.spread_bps-b.evaluation.spread_bps||a.evaluation.slippage_bps-b.evaluation.slippage_bps)
  return {selected:eligible[0]||null,evaluated}
}

export function createConversionIntent(input={}){
  if(!input.intent_id||!input.merchant_id||!input.from_asset||!input.to_asset)throw new TypeError('conversion intent fields required')
  if(String(input.from_asset).toUpperCase()===String(input.to_asset).toUpperCase())throw new Error('same_asset_conversion_not_required')
  const amount=Number(input.amount)
  if(!Number.isFinite(amount)||amount<=0)throw new Error('invalid_amount')
  return {
    intent_id:String(input.intent_id),
    merchant_id:String(input.merchant_id),
    from_asset:String(input.from_asset).toUpperCase(),
    to_asset:String(input.to_asset).toUpperCase(),
    amount,
    preference:input.preference||null,
    max_spread_bps:Number(input.max_spread_bps??150),
    max_slippage_bps:Number(input.max_slippage_bps??100),
    state:'CREATED',
    created_at:now()
  }
}

export function quoteConversion(intent,{reference,route}={}){
  if(!reference?.available)throw new Error('verified_reference_required')
  if(!route?.selected?.evaluation?.eligible)throw new Error('eligible_liquidity_route_required')
  const offer=route.selected.offer
  const executionPrice=Number(offer.expected_execution_price??offer.price)
  return {
    ...clone(intent),
    state:'QUOTED',
    reference_price:reference.price,
    execution_price:executionPrice,
    estimated_to_amount:Number(intent.amount)*executionPrice,
    route_id:offer.route_id||offer.offer_id||null,
    venue_id:offer.venue_id||null,
    quote_source_ids:[...reference.source_ids],
    quoted_at:now()
  }
}

export function authorizeConversion(intent,{approved=false}={}){
  if(intent?.state!=='QUOTED')throw new Error('quoted_conversion_required')
  return {...clone(intent),state:approved?'AUTHORIZED':'QUOTED',authorized_at:approved?now():null}
}

export function recordExecution(intent,{execution_id,actual_price,actual_to_amount,trade_reference,settlement_evidence_ref,self_trade=false}={}){
  if(intent?.state!=='AUTHORIZED')throw new Error('authorized_conversion_required')
  if(self_trade)throw new Error('self_trade_prohibited')
  if(!execution_id||!trade_reference||!settlement_evidence_ref)throw new TypeError('execution evidence required')
  const actual=Number(actual_price)
  const slippageBps=Math.abs((actual-Number(intent.execution_price))/Number(intent.execution_price))*10000
  if(slippageBps>Number(intent.max_slippage_bps))throw new Error('actual_slippage_exceeded')
  return {
    ...clone(intent),
    state:'SETTLED',
    execution_id:String(execution_id),
    actual_price:actual,
    actual_to_amount:Number(actual_to_amount),
    trade_reference:String(trade_reference),
    settlement_evidence_ref:String(settlement_evidence_ref),
    actual_slippage_bps:slippageBps,
    settled_at:now()
  }
}

export function applyMerchantPreference({receivedAsset,preference}={}){
  const asset=String(receivedAsset||'').toUpperCase()
  if(!preference||preference==='HOLD_AS_RECEIVED')return {action:'HOLD',target_asset:asset}
  const map={SETTLE_TO_BTC:'BTC',SETTLE_TO_XCP:'XCP',SETTLE_TO_NOMNI:'NOMNI'}
  if(map[preference])return {action:map[preference]===asset?'HOLD':'CONVERT',target_asset:map[preference]}
  if(String(preference).startsWith('SETTLE_TO_COUNTERPARTY_ASSET:'))return {action:'CONVERT',target_asset:String(preference).split(':')[1].toUpperCase()}
  return {action:'REVIEW',target_asset:null}
}

export function conversionSnapshot({quotes=[],intents=[],executions=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Multi-Asset Conversion & Merchant Liquidity Engine',
    quotes:{total:quotes.length,executable:quotes.filter(x=>x.executable).length},
    conversions:{total:intents.length,quoted:intents.filter(x=>x.state==='QUOTED').length,authorized:intents.filter(x=>x.state==='AUTHORIZED').length,settled:executions.filter(x=>x.state==='SETTLED').length},
    protections:{self_trade_prevention:true,invented_price:false,private_keys_stored:false},
    generated_at:now()
  }
}
