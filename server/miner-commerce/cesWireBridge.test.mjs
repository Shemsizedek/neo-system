import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeCesTrade,reconcileCesPayment,validateCesCoordinatorConfig} from './cesCoordinatorGateway.mjs'
import {createWireSettlementInstruction,miningOrderToWireRoute,reconcileWireSettlement} from './neoWireBridge.mjs'

test('CES coordinator fails closed until configured',()=>{
  const result=validateCesCoordinatorConfig({enabled:true,endpoint:'http://example.test',exchangeId:'EX1'})
  assert.equal(result.ready,false)
  assert.ok(result.errors.length>=2)
})

test('CES posted trade reconciles exact order',()=>{
  const trade=normalizeCesTrade({tradeId:'T1',exchangeId:'EX1',debitAccount:'BUYER',creditAccount:'NEO',amount:144,currency:'NEOCES',status:'POSTED'})
  const result=reconcileCesPayment({order:{id:'O1',paymentRail:'CES',exchangeId:'EX1',customerCesAccount:'BUYER',currency:'NEOCES',amount:144},trade,merchantAccountId:'NEO'})
  assert.equal(result.matched,true)
})

test('NEO Wire refuses demo event as live settlement',()=>{
  const instruction=createWireSettlementInstruction({id:'NW1',orderId:'O2',rail:'NEO_WIRE_CES',currency:'NEOCES',amount:50,source:'BUYER',destination:'NEO',mode:'DEMO'})
  const result=reconcileWireSettlement({order:{id:'O2'},instruction,event:{wireId:'NW1',status:'SETTLED',currency:'NEOCES',amount:50}})
  assert.equal(result.matched,false)
  assert.ok(result.reasons.includes('instruction is not live'))
})

test('mining rail maps to NEO Wire route',()=>{
  assert.equal(miningOrderToWireRoute({paymentRail:'CES'}),'NEO_WIRE_CES')
  assert.equal(miningOrderToWireRoute({paymentRail:'BTC_ONCHAIN'}),'NEO_WIRE_BTC')
})
