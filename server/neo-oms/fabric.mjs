import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function createParentOrder(input={}){
  if(!input.order_id||!input.owner_id||!input.base_asset||!input.quote_asset||!input.side)throw new TypeError('order_id, owner_id, pair and side required')
  const quantity=Number(input.quantity),limitPrice=input.limit_price==null?null:Number(input.limit_price)
  if(!Number.isFinite(quantity)||quantity<=0)throw new Error('invalid_quantity')
  if(limitPrice!=null&&(!Number.isFinite(limitPrice)||limitPrice<=0))throw new Error('invalid_limit_price')
  return {
    order_id:String(input.order_id),
    owner_id:String(input.owner_id),
    portfolio_id:input.portfolio_id||null,
    base_asset:String(input.base_asset).toUpperCase(),
    quote_asset:String(input.quote_asset).toUpperCase(),
    side:String(input.side).toUpperCase(),
    quantity,
    remaining_quantity:quantity,
    limit_price:limitPrice,
    strategy:String(input.strategy||'DIRECT').toUpperCase(),
    max_participation_rate:Number(input.max_participation_rate??0.1),
    state:'NEW',
    created_at:now()
  }
}

export function evaluatePreTradeRisk(order,limits={}){
  const reasons=[]
  const referencePrice=Number(limits.reference_price||order.limit_price||0)
  const notional=referencePrice>0?referencePrice*Number(order.quantity):null
  if(limits.max_order_quantity!=null&&order.quantity>Number(limits.max_order_quantity))reasons.push('max_order_quantity_exceeded')
  if(limits.max_order_notional!=null&&notional!=null&&notional>Number(limits.max_order_notional))reasons.push('max_order_notional_exceeded')
  if(order.max_participation_rate<=0||order.max_participation_rate>Number(limits.max_participation_rate??0.25))reasons.push('participation_rate_exceeded')
  if(order.side==='BUY'&&limits.max_buy_price!=null&&order.limit_price!=null&&order.limit_price>Number(limits.max_buy_price))reasons.push('buy_price_limit_exceeded')
  if(order.side==='SELL'&&limits.min_sell_price!=null&&order.limit_price!=null&&order.limit_price<Number(limits.min_sell_price))reasons.push('sell_price_limit_exceeded')
  if(limits.position_limit!=null&&Math.abs(Number(limits.current_position||0)+(order.side==='BUY'?order.quantity:-order.quantity))>Number(limits.position_limit))reasons.push('position_limit_exceeded')
  return {allowed:reasons.length===0,reasons,notional,checked_at:now()}
}

export function approveParentOrder(order,{risk,approved=false}={}){
  if(!risk?.allowed)return {...clone(order),state:'REJECTED',risk:clone(risk)}
  if(!approved)return {...clone(order),state:'RISK_CHECKED',risk:clone(risk)}
  return {...clone(order),state:'APPROVED',risk:clone(risk),approved_at:now()}
}

function slicesFor(order,{intervals=1,marketVolume=0}={}){
  const n=Math.max(1,Math.floor(Number(intervals)||1))
  if(order.strategy==='POV'){
    const target=Math.min(order.quantity,Math.max(0,Number(marketVolume))*order.max_participation_rate)
    return target>0?[target]:[]
  }
  if(order.strategy==='TWAP'||order.strategy==='VWAP'){
    const base=order.quantity/n
    return Array.from({length:n},(_,i)=>i===n-1?order.quantity-base*(n-1):base)
  }
  return [order.quantity]
}

export function buildExecutionPlan(order,{intervals=1,volumeProfile=[],marketVolume=0}={}){
  if(!['APPROVED','WORKING'].includes(order?.state))throw new Error('approved_parent_order_required')
  let quantities=slicesFor(order,{intervals,marketVolume})
  if(order.strategy==='VWAP'&&Array.isArray(volumeProfile)&&volumeProfile.length){
    const weights=volumeProfile.map(Number),sum=weights.reduce((a,b)=>a+Math.max(0,b),0)
    if(sum>0)quantities=weights.map(w=>order.quantity*Math.max(0,w)/sum)
  }
  const children=quantities.filter(q=>q>0).map((q,i)=>({
    child_order_id:`${order.order_id}-C${String(i+1).padStart(3,'0')}`,
    parent_order_id:order.order_id,
    owner_id:order.owner_id,
    base_asset:order.base_asset,
    quote_asset:order.quote_asset,
    side:order.side,
    quantity:Number(q),
    limit_price:order.limit_price,
    state:'NEW',
    slice_index:i,
    created_at:now()
  }))
  return {parent_order_id:order.order_id,strategy:order.strategy,children,total_quantity:children.reduce((n,x)=>n+x.quantity,0)}
}

export function routeChildOrder(child,{routerDecision}={}){
  if(!child?.child_order_id)throw new TypeError('child order required')
  if(!routerDecision?.selected?.eligible)return {...clone(child),state:'REJECTED',reason:'no_eligible_route'}
  if(routerDecision.selected.self_trade===true)return {...clone(child),state:'REJECTED',reason:'self_trade_prohibited'}
  return {...clone(child),state:'ROUTED',venue_id:routerDecision.selected.venue_id,expected_price:routerDecision.selected.execution_price,execution_type:routerDecision.selected.execution_type,routed_at:now()}
}

export function recordFill(child,{fill_id,price,quantity,venue_trade_id,settlement_evidence_ref=null}={}){
  if(child?.state!=='ROUTED'&&child?.state!=='PARTIALLY_FILLED')throw new Error('routed_child_required')
  const q=Number(quantity),p=Number(price)
  if(!fill_id||!venue_trade_id||q<=0||p<=0)throw new TypeError('valid fill evidence required')
  const previous=Number(child.filled_quantity||0),filled=Math.min(Number(child.quantity),previous+q)
  return {...clone(child),filled_quantity:filled,average_price:previous===0?p:((Number(child.average_price||0)*previous)+(p*q))/(previous+q),venue_trade_id:String(venue_trade_id),settlement_evidence_ref:settlement_evidence_ref,state:filled>=Number(child.quantity)?'FILLED':'PARTIALLY_FILLED',last_fill_id:String(fill_id),last_fill_at:now()}
}

export function aggregateParent(parent,children=[]){
  const filled=children.reduce((n,x)=>n+Number(x.filled_quantity||0),0)
  const value=children.reduce((n,x)=>n+Number(x.filled_quantity||0)*Number(x.average_price||0),0)
  return {...clone(parent),filled_quantity:filled,remaining_quantity:Math.max(0,parent.quantity-filled),average_price:filled?value/filled:null,state:filled>=parent.quantity?'FILLED':filled>0?'PARTIALLY_FILLED':'WORKING'}
}

export function allocateFills(parent,{allocations=[]}={}){
  if(parent?.state!=='FILLED')throw new Error('filled_parent_required')
  const total=allocations.reduce((n,x)=>n+Number(x.quantity||0),0)
  if(Math.abs(total-Number(parent.filled_quantity||0))>1e-9)throw new Error('allocation_quantity_mismatch')
  return {
    order_id:parent.order_id,
    allocations:allocations.map((x,i)=>({allocation_id:x.allocation_id||`ALC-${i+1}`,account_id:String(x.account_id),quantity:Number(x.quantity),average_price:parent.average_price})),
    state:'ALLOCATED',
    allocated_at:now()
  }
}

export function createAuditEvent({event_type,entity_id,actor_id,data={},previous_digest=null}={}){
  if(!event_type||!entity_id)throw new TypeError('event_type and entity_id required')
  const event={audit_id:`AUD-${crypto.randomUUID()}`,event_type:String(event_type),entity_id:String(entity_id),actor_id:actor_id||null,data:clone(data),previous_digest,recorded_at:now()}
  return {...event,digest:digest(event)}
}

export function verifyAuditChain(events=[]){
  for(let i=0;i<events.length;i++){
    if(i>0&&events[i].previous_digest!==events[i-1].digest)return {valid:false,index:i,reason:'broken_previous_digest'}
    const {digest:stored,...payload}=events[i]
    if(digest(payload)!==stored)return {valid:false,index:i,reason:'digest_mismatch'}
  }
  return {valid:true,count:events.length}
}

export function omsSnapshot({parents=[],children=[],fills=[],allocations=[],audit=[]}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Institutional OMS / EMS',
    orders:{parents:parents.length,working:parents.filter(x=>['WORKING','PARTIALLY_FILLED'].includes(x.state)).length,filled:parents.filter(x=>x.state==='FILLED').length},
    children:{total:children.length,routed:children.filter(x=>x.state==='ROUTED').length,filled:children.filter(x=>x.state==='FILLED').length},
    fills:fills.length,
    allocations:allocations.length,
    audit:{events:audit.length,chain_valid:verifyAuditChain(audit).valid},
    protections:{pre_trade_risk:true,self_trade_prevention:true,wash_trading_prohibited:true},
    generated_at:now()
  }
}
