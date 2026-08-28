import test from 'node:test'
import assert from 'node:assert/strict'
import {createContract,confirmPayment,reserveCapacity,activateContract,markSettlementPending,settleContract} from './contracts.mjs'

test('production cloud mining contract follows guarded lifecycle',()=>{
  let c=createContract({customerId:'C1',hashrateTh:100,termMonths:12,currency:'USD',quotedAmount:5000,settlementDestination:'bc1qexample',simulation:false})
  c=confirmPayment(c,{paymentReference:'pay_1',amount:5000,currency:'USD'})
  c=reserveCapacity(c,{reservationId:'res_1',backedHashrateTh:120})
  c=activateContract(c,{activationId:'act_1',minerAllocationIds:['m1'],settlementDestinationVerified:true,productionReady:true})
  c=markSettlementPending(c,{batchId:'b1',attributedBtc:0.01})
  c=settleContract(c,{settlementReference:'tx1',netBtc:0.009})
  assert.equal(c.state,'SETTLED')
  assert.equal(c.history.length,6)
})

test('live activation blocks simulation and under-backed capacity',()=>{
  let c=createContract({customerId:'C1',hashrateTh:100,termMonths:12,currency:'USD',quotedAmount:5000,simulation:true})
  c=confirmPayment(c,{paymentReference:'pay_1',amount:5000,currency:'USD'})
  assert.throws(()=>reserveCapacity(c,{reservationId:'res_1',backedHashrateTh:50}),/INSUFFICIENT/)
  c=reserveCapacity(c,{reservationId:'res_1',backedHashrateTh:100})
  assert.throws(()=>activateContract(c,{activationId:'act_1',minerAllocationIds:['m1'],settlementDestinationVerified:true,productionReady:true}),/SIMULATION/)
})
