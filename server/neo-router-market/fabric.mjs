import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)

export function registerVenue(input={}){
 if(!input.venue_id||!input.venue_type)throw new TypeError('venue_id and venue_type required')
 return {venue_id:String(input.venue_id),venue_type:String(input.venue_type),authorized:input.authorized===true,execution_adapter:input.execution_adapter||null,health:input.health||'UNKNOWN',latency_ms:Number(input.latency_ms||0),last_seen_at:input.last_seen_at||null,created_at:now()}
}

export function normalizeBook(input={}){
 if(!input.venue_id||!input.base_asset||!input.quote_asset)throw new TypeError('venue and pair required')
 const normSide=(rows,side)=>Array.isArray(rows)?rows.map((r,i)=>({id:r.id||`${side}-${i}`,price:Number(r.price??r[0]),quantity:Number(r.quantity??r[1]),owner_id:r.owner_id||null})).filter(x=>x.price>0&&x.quantity>0):[]
 return {venue_id:String(input.venue_id),base_asset:String(input.base_asset).toUpperCase(),quote_asset:String(input.quote_asset).toUpperCase(),bids:normSide(input.bids,'bid').sort((a,b)=>b.price-a.price),asks:normSide(input.asks,'ask').sort((a,b)=>a.price-b.price),observed_at:input.observed_at||now(),source_ref:input.source_ref||null}
}

export function createRfq(input={}){
 if(!input.rfq_id||!input.venue_id||!input.base_asset||!input.quote_asset)throw new TypeError('rfq fields required')
 return {rfq_id:String(input.rfq_id),venue_id:String(input.venue_id),base_asset:String(input.base_asset).toUpperCase(),quote_asset:String(input.quote_asset).toUpperCase(),side:String(input.side||'BUY').toUpperCase(),quantity:Number(input.quantity||0),price:Number(input.price||0),expires_at:input.expires_at||null,counterparty_id:input.counterparty_id||null,owner_id:input.owner_id||null,executable:input.executable===true,created_at:now()}
}

export function evaluateVenueHealth(venue,{maxLatencyMs=2500,maxAgeMs=120000,at=new Date()}={}){
 const age=venue.last_seen_at?+new Date(at)-+new Date(venue.last_seen_at):Infinity
 const healthy=venue.authorized===true&&venue.health==='HEALTHY'&&venue.latency_ms<=maxLatencyMs&&age>=0&&age<=maxAgeMs&&Boolean(venue.execution_adapter)
 return {venue_id:venue.venue_id,healthy,age_ms:age,latency_ms:venue.latency_ms,reason:healthy?'eligible':'unhealthy_or_unconfigured'}
}

function vwap(rows,quantity){
 let remaining=Number(quantity),cost=0,filled=0
 for(const r of rows){const take=Math.min(remaining,Number(r.quantity));cost+=take*Number(r.price);filled+=take;remaining-=take;if(remaining<=0)break}
 return filled>0&&remaining<=0?{filled,price:cost/filled}:null
}

export function scoreRoute({venue,book,rfq,side='BUY',quantity,referencePrice,requester_id,maxSlippageBps=100}={}){
 const health=evaluateVenueHealth(venue)
 if(!health.healthy)return {eligible:false,reason:health.reason,venue_id:venue?.venue_id}
 const candidates=[]
 if(book){
   const rows=String(side).toUpperCase()==='BUY'?book.asks:book.bids
   const filtered=rows.filter(r=>!requester_id||!r.owner_id||r.owner_id!==requester_id)
   if(filtered.length!==rows.length&&filtered.length===0)return {eligible:false,reason:'self_trade_only_liquidity',venue_id:venue.venue_id}
   const fill=vwap(filtered,quantity);if(fill)candidates.push({type:'ORDER_BOOK',price:fill.price,filled:fill.filled})
 }
 if(rfq?.executable&&(!requester_id||!rfq.counterparty_id||rfq.counterparty_id!==requester_id)&&Number(rfq.quantity)>=Number(quantity))candidates.push({type:'RFQ',price:Number(rfq.price),filled:Number(quantity),rfq_id:rfq.rfq_id})
 if(!candidates.length)return {eligible:false,reason:'insufficient_executable_liquidity',venue_id:venue.venue_id}
 candidates.sort((a,b)=>String(side).toUpperCase()==='BUY'?a.price-b.price:b.price-a.price)
 const best=candidates[0],slippageBps=referencePrice?Math.abs((best.price-Number(referencePrice))/Number(referencePrice))*10000:0
 if(referencePrice&&slippageBps>Number(maxSlippageBps))return {eligible:false,reason:'slippage_limit_exceeded',venue_id:venue.venue_id,slippage_bps:slippageBps}
 const score=(1000000/(1+Math.max(0,venue.latency_ms)))+(String(side).toUpperCase()==='BUY'?-best.price:best.price)
 return {eligible:true,venue_id:venue.venue_id,execution_type:best.type,execution_price:best.price,quantity:best.filled,slippage_bps:slippageBps,score,rfq_id:best.rfq_id||null}
}

export function chooseBestRoute({venues=[],books=[],rfqs=[],request}={}){
 const scored=venues.map(v=>scoreRoute({venue:v,book:books.find(b=>b.venue_id===v.venue_id&&b.base_asset===request.base_asset&&b.quote_asset===request.quote_asset),rfq:rfqs.find(r=>r.venue_id===v.venue_id&&r.base_asset===request.base_asset&&r.quote_asset===request.quote_asset&&r.side===request.side),side:request.side,quantity:request.quantity,referencePrice:request.reference_price,requester_id:request.requester_id,maxSlippageBps:request.max_slippage_bps??100}))
 const eligible=scored.filter(x=>x.eligible).sort((a,b)=>b.score-a.score)
 return {selected:eligible[0]||null,evaluated:scored}
}

export function createExecutionIntent({route,request}={}){
 if(!route?.selected?.eligible)throw new Error('eligible_route_required')
 const r=route.selected
 return {execution_id:`EXE-${crypto.randomUUID()}`,venue_id:r.venue_id,side:request.side,base_asset:request.base_asset,quote_asset:request.quote_asset,quantity:Number(request.quantity),expected_price:r.execution_price,execution_type:r.execution_type,rfq_id:r.rfq_id||null,state:'ROUTED',requester_id:request.requester_id||null,created_at:now()}
}

export function reconcileExecution(intent,{venue_trade_id,actual_price,filled_quantity,settlement_evidence_ref,self_trade=false}={}){
 if(intent?.state!=='ROUTED')throw new Error('routed_execution_required')
 if(self_trade)throw new Error('self_trade_prohibited')
 if(!venue_trade_id||!settlement_evidence_ref)throw new TypeError('execution evidence required')
 const fill=Number(filled_quantity),price=Number(actual_price)
 if(fill<=0||price<=0)throw new Error('invalid_execution')
 return {...clone(intent),state:fill>=intent.quantity?'RECONCILED':'PARTIAL',venue_trade_id:String(venue_trade_id),actual_price:price,filled_quantity:fill,settlement_evidence_ref:String(settlement_evidence_ref),reconciled_at:now()}
}

export function routerSnapshot({venues=[],books=[],rfqs=[],executions=[]}={}){
 return {estate:'Global Vast Estate',fabric:'NEO Liquidity Venue & Smart Order Router',venues:{total:venues.length,healthy:venues.filter(v=>evaluateVenueHealth(v).healthy).length},market_data:{books:books.length,rfqs:rfqs.length},executions:{total:executions.length,reconciled:executions.filter(x=>x.state==='RECONCILED').length,partial:executions.filter(x=>x.state==='PARTIAL').length},protections:{self_trade_prevention:true,wash_trading_prohibited:true,synthetic_liquidity_without_source:false},generated_at:now()}
}
