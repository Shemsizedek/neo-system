import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')

export function captureTrade(input={}){
  if(!input.trade_id||!input.buyer||!input.seller||!input.asset||!Number.isFinite(Number(input.quantity))||!Number.isFinite(Number(input.price)))throw new TypeError('trade_id, buyer, seller, asset, quantity and price required')
  const trade={
    trade_id:String(input.trade_id),
    buyer:String(input.buyer),
    seller:String(input.seller),
    asset:String(input.asset),
    quantity:Number(input.quantity),
    price:Number(input.price),
    currency:String(input.currency||'NOMNI'),
    venue:input.venue||'NEO_COMMUNITY',
    settlement_date:input.settlement_date||null,
    state:'CAPTURED',
    captured_at:input.captured_at||now()
  }
  return {...trade,notional:trade.quantity*trade.price,digest:hash(trade)}
}

export function acceptTrade(trade,{accepted=true,reason=null}={}){
  if(!trade?.trade_id)throw new TypeError('trade required')
  return {...clone(trade),state:accepted?'ACCEPTED':'CANCELLED',acceptance_reason:reason,accepted_at:now()}
}

export function buildPositions(trades=[]){
  const map=new Map()
  for(const t of trades.filter(x=>['ACCEPTED','NETTED','MARGINED','READY_TO_SETTLE','SETTLING','SETTLED'].includes(x.state))){
    const buyerKey=`${t.buyer}::${t.asset}`,sellerKey=`${t.seller}::${t.asset}`
    const b=map.get(buyerKey)||{participant:t.buyer,asset:t.asset,quantity:0,cash:0}
    b.quantity+=t.quantity;b.cash-=t.notional;map.set(buyerKey,b)
    const s=map.get(sellerKey)||{participant:t.seller,asset:t.asset,quantity:0,cash:0}
    s.quantity-=t.quantity;s.cash+=t.notional;map.set(sellerKey,s)
  }
  return [...map.values()].map(x=>({...x,quantity:Number(x.quantity.toFixed(12)),cash:Number(x.cash.toFixed(12))}))
}

export function bilateralNet(trades=[]){
  const groups=new Map()
  for(const t of trades.filter(x=>x.state==='ACCEPTED')){
    const parties=[t.buyer,t.seller].sort(),key=`${parties[0]}::${parties[1]}::${t.asset}::${t.currency}`
    const sign=t.buyer===parties[0]?1:-1
    const g=groups.get(key)||{party_a:parties[0],party_b:parties[1],asset:t.asset,currency:t.currency,net_quantity:0,net_cash:0,trade_ids:[]}
    g.net_quantity+=sign*t.quantity;g.net_cash-=sign*t.notional;g.trade_ids.push(t.trade_id);groups.set(key,g)
  }
  return [...groups.values()].map(g=>({...g,net_quantity:Number(g.net_quantity.toFixed(12)),net_cash:Number(g.net_cash.toFixed(12))}))
}

export function multilateralNet(trades=[]){
  const positions=buildPositions(trades)
  return positions.filter(p=>p.quantity!==0||p.cash!==0).map(p=>({participant:p.participant,asset:p.asset,net_quantity:p.quantity,net_cash:p.cash}))
}

export function calculateMargin({positions=[],volatility=0.15,initialMultiplier=1.25,variationPrices={}}={}){
  const calls=[]
  for(const p of positions){
    const ref=Math.abs(Number(variationPrices[p.asset]||1))
    const exposure=Math.abs(Number(p.quantity))*ref
    const initial=exposure*Math.max(0,Number(volatility))*Math.max(0,Number(initialMultiplier))
    const variation=Number(p.cash||0)<0?Math.abs(Number(p.cash)):0
    calls.push({participant:p.participant,asset:p.asset,initial_margin:initial,variation_margin:variation,total_required:initial+variation})
  }
  return calls
}

export function applyHaircut({marketValue,haircutBps=0}={}){
  const mv=Math.max(0,Number(marketValue||0)),h=Math.min(10000,Math.max(0,Number(haircutBps||0)))
  return {market_value:mv,haircut_bps:h,eligible_value:mv*(1-h/10000)}
}

export function evaluateCollateral({marginCall,collateral=[]}={}){
  const eligible=collateral.reduce((n,c)=>n+applyHaircut(c).eligible_value,0)
  const required=Number(marginCall?.total_required||0)
  return {required,eligible,shortfall:Math.max(0,required-eligible),satisfied:eligible>=required}
}

export function createSettlementInstruction({instruction_id,trade_ids=[],deliverer,receiver,asset,quantity,payer,payee,currency='NOMNI',cash_amount,method='DVP'}={}){
  if(!instruction_id||!deliverer||!receiver||!asset||!payer||!payee)throw new TypeError('settlement instruction fields required')
  return {
    instruction_id:String(instruction_id),
    trade_ids:[...trade_ids],
    method,
    securities_leg:{from:deliverer,to:receiver,asset,quantity:Number(quantity||0)},
    cash_leg:{from:payer,to:payee,currency,amount:Number(cash_amount||0)},
    state:'READY_TO_SETTLE',
    created_at:now()
  }
}

export function recordSettlementEvidence({instruction,evidenceType,reference,verified=false,source='NEO_CROWN_CHAIN'}={}){
  if(!instruction?.instruction_id||!evidenceType||!reference)throw new TypeError('instruction, evidenceType and reference required')
  return {
    evidence_id:`EVD-${crypto.randomUUID()}`,
    instruction_id:instruction.instruction_id,
    evidence_type:String(evidenceType),
    reference:String(reference),
    source,
    verified:Boolean(verified),
    recorded_at:now()
  }
}

export function determineFinality({instruction,evidence=[]}={}){
  const receipts=evidence.filter(e=>e.instruction_id===instruction?.instruction_id&&e.verified)
  const settlement=receipts.some(e=>e.evidence_type==='SETTLEMENT_RECEIPT')
  const finality=receipts.some(e=>e.evidence_type==='FINALITY_ATTESTATION')
  return {
    instruction_id:instruction?.instruction_id||null,
    settled:settlement,
    final:Boolean(settlement&&finality),
    state:settlement&&finality?'SETTLED':settlement?'SETTLING':'READY_TO_SETTLE',
    evidence_refs:receipts.map(e=>e.reference)
  }
}

export function clearingSnapshot({trades=[],instructions=[],evidence=[]}={}){
  const finals=instructions.map(i=>determineFinality({instruction:i,evidence}))
  return {
    estate:'Global Vast Estate',
    operator_model:'Central Counterparty Community Trust',
    fabric:'NEO Community Clearing, Netting and Settlement',
    trades:{total:trades.length,accepted:trades.filter(t=>t.state==='ACCEPTED').length,settled:finals.filter(x=>x.final).length},
    positions:buildPositions(trades),
    settlement:{instructions:instructions.length,final:finals.filter(x=>x.final).length,pending:finals.filter(x=>!x.final).length},
    authority_boundary:'Community contractual clearing and settlement do not establish statutory clearing-agency or DTC/DTCC status.',
    generated_at:now()
  }
}
