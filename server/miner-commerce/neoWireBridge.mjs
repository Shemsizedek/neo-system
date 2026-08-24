export const NEO_WIRE_RAILS=['NEO_WIRE_BANK','NEO_WIRE_BTC','NEO_WIRE_LIGHTNING','NEO_WIRE_XCP','NEO_WIRE_CES']

export function validateWireInstruction(instruction={}){
  const errors=[]
  if(!instruction.id) errors.push('wire id required')
  if(!NEO_WIRE_RAILS.includes(instruction.rail)) errors.push('unsupported NEO Wire rail')
  if(!instruction.orderId) errors.push('orderId required')
  if(!instruction.currency) errors.push('currency required')
  if(!Number.isFinite(Number(instruction.amount))||Number(instruction.amount)<=0) errors.push('positive amount required')
  if(!instruction.destination) errors.push('destination required')
  if(instruction.mode!=='LIVE'&&instruction.mode!=='DEMO') errors.push('mode must be LIVE or DEMO')
  return {valid:errors.length===0,errors}
}

export function createWireSettlementInstruction({id,orderId,rail,currency,amount,source,destination,mode='DEMO',metadata={}}){
  const instruction={id,orderId,rail,currency,amount:Number(amount),source,destination,mode,metadata,status:'PENDING',createdAt:new Date().toISOString()}
  const check=validateWireInstruction(instruction)
  if(!check.valid) throw new Error(check.errors.join('; '))
  return instruction
}

export function reconcileWireSettlement({order,instruction,event}){
  const reasons=[]
  if(instruction.orderId!==order.id) reasons.push('order mismatch')
  if(event.wireId!==instruction.id) reasons.push('wire id mismatch')
  if(String(event.status).toUpperCase()!=='SETTLED') reasons.push('wire not settled')
  if(event.currency!==instruction.currency) reasons.push('currency mismatch')
  if(Math.abs(Number(event.amount)-Number(instruction.amount))>1e-8) reasons.push('amount mismatch')
  if(instruction.mode!=='LIVE') reasons.push('instruction is not live')
  return {matched:reasons.length===0,reasons,orderId:order.id,wireId:instruction.id,settlementRef:event.settlementRef??null}
}

export function miningOrderToWireRoute(order){
  const map={
    WIRE:'NEO_WIRE_BANK',
    BTC_ONCHAIN:'NEO_WIRE_BTC',
    LIGHTNING:'NEO_WIRE_LIGHTNING',
    COUNTERPARTY:'NEO_WIRE_XCP',
    CES:'NEO_WIRE_CES'
  }
  return map[order.paymentRail]??null
}
