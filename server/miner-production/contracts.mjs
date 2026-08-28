import crypto from 'node:crypto'

export const CONTRACT_STATES=['PAYMENT_PENDING','PAID','CAPACITY_RESERVED','ACTIVE','SUSPENDED','SETTLEMENT_PENDING','SETTLED','CANCELLED']

export function createContract(input={}){
  if(!input.customerId||!input.hashrateTh||!input.termMonths||!input.currency) throw new Error('INVALID_CONTRACT_INPUT')
  const now=new Date().toISOString()
  return {
    id:input.id||`CMC-${crypto.randomUUID()}`,
    customerId:input.customerId,
    productId:input.productId||null,
    hashrateTh:Number(input.hashrateTh),
    termMonths:Number(input.termMonths),
    currency:String(input.currency).toUpperCase(),
    quotedAmount:Number(input.quotedAmount||0),
    paymentRail:input.paymentRail||null,
    paymentReference:null,
    capacityReservationId:null,
    minerAllocationIds:[],
    settlementDestination:input.settlementDestination||null,
    state:'PAYMENT_PENDING',
    simulation:Boolean(input.simulation),
    createdAt:now,
    updatedAt:now,
    history:[{state:'PAYMENT_PENDING',at:now,reason:'CONTRACT_CREATED'}]
  }
}

function transition(contract,state,reason,patch={}){
  if(!CONTRACT_STATES.includes(state)) throw new Error('INVALID_CONTRACT_STATE')
  const at=new Date().toISOString()
  return {...contract,...patch,state,updatedAt:at,history:[...(contract.history||[]),{state,at,reason}]}
}

export function confirmPayment(contract,{paymentReference,amount,currency}){
  if(contract.state!=='PAYMENT_PENDING') throw new Error('PAYMENT_STATE_INVALID')
  if(!paymentReference) throw new Error('PAYMENT_REFERENCE_REQUIRED')
  if(String(currency).toUpperCase()!==contract.currency) throw new Error('PAYMENT_CURRENCY_MISMATCH')
  if(Number(amount)<Number(contract.quotedAmount)) throw new Error('PAYMENT_AMOUNT_SHORT')
  return transition(contract,'PAID','PAYMENT_CONFIRMED',{paymentReference})
}

export function reserveCapacity(contract,{reservationId,backedHashrateTh}){
  if(contract.state!=='PAID') throw new Error('CAPACITY_STATE_INVALID')
  if(Number(backedHashrateTh)<Number(contract.hashrateTh)) throw new Error('INSUFFICIENT_BACKED_HASHRATE')
  return transition(contract,'CAPACITY_RESERVED','CAPACITY_BACKED',{capacityReservationId:reservationId})
}

export function activateContract(contract,{activationId,minerAllocationIds=[],settlementDestinationVerified=false,productionReady=false}){
  if(contract.state!=='CAPACITY_RESERVED') throw new Error('ACTIVATION_STATE_INVALID')
  if(contract.simulation) throw new Error('SIMULATION_CONTRACT_CANNOT_ACTIVATE_LIVE')
  if(!productionReady||!settlementDestinationVerified) throw new Error('PRODUCTION_GATE_BLOCKED')
  if(!activationId||minerAllocationIds.length===0) throw new Error('ACTIVATION_ALLOCATION_REQUIRED')
  return transition(contract,'ACTIVE','LIVE_MINING_ACTIVATED',{activationId,minerAllocationIds,activatedAt:new Date().toISOString()})
}

export function markSettlementPending(contract,{batchId,attributedBtc}){
  if(contract.state!=='ACTIVE') throw new Error('SETTLEMENT_STATE_INVALID')
  if(!batchId||Number(attributedBtc)<=0) throw new Error('SETTLEMENT_DATA_INVALID')
  return transition(contract,'SETTLEMENT_PENDING','VERIFIED_MINING_ATTRIBUTION',{settlementBatchId:batchId,attributedBtc:Number(attributedBtc)})
}

export function settleContract(contract,{settlementReference,netBtc}){
  if(contract.state!=='SETTLEMENT_PENDING') throw new Error('FINAL_SETTLEMENT_STATE_INVALID')
  if(!settlementReference||Number(netBtc)<0) throw new Error('FINAL_SETTLEMENT_DATA_INVALID')
  return transition(contract,'SETTLED','BTC_SETTLED',{settlementReference,netBtc:Number(netBtc),settledAt:new Date().toISOString()})
}
