import test from 'node:test'
import assert from 'node:assert/strict'
import {applyPaymentEvent,canActivateDigital,createAuthoritativeQuote,createCheckoutSession,createReceipt,createRefundRequest,createResourceLock} from './orchestrator.mjs'

function seed(simulation=true){
  const quote=createAuthoritativeQuote({sku:'NEO-DIGITAL-CORE',productType:'DIGITAL',hashrateTh:100,termMonths:12,baseAmountUsd:4800,paymentCurrency:'USD',fxRate:1,fxSource:'TEST',simulation})
  const lock=createResourceLock({orderId:'ord-1',productType:'DIGITAL',sku:'NEO-DIGITAL-CORE',hashrateTh:100,simulation})
  const checkout=createCheckoutSession({customerId:'cust-1',quote,lock,compliance:'CLEARED'})
  return {quote,lock,checkout}
}

test('duplicate provider event is idempotent',()=>{
  const {checkout}=seed()
  const seen=new Set()
  const event={eventId:'evt-1',paymentStatus:'CONFIRMED',providerReference:'pay-1'}
  const first=applyPaymentEvent(checkout,event,seen)
  const second=applyPaymentEvent(first.checkout,event,seen)
  assert.equal(first.checkout.paymentStatus,'CONFIRMED')
  assert.equal(second.duplicate,true)
})

test('simulation checkout cannot activate digital mining contract',()=>{
  const {quote,lock,checkout}=seed(true)
  const confirmed=applyPaymentEvent(checkout,{eventId:'evt-2',paymentStatus:'CONFIRMED'},new Set()).checkout
  const gate=canActivateDigital({checkout:confirmed,quote,lock,compliance:'CLEARED',contractExecuted:true,physicalBackingVerified:true,mode:'LIVE'})
  assert.equal(gate.eligible,false)
  assert.ok(gate.reasons.includes('SIMULATION_RECORD'))
})

test('live records can pass activation gate when all conditions hold',()=>{
  const {quote,lock,checkout}=seed(false)
  const confirmed=applyPaymentEvent(checkout,{eventId:'evt-3',paymentStatus:'CONFIRMED'},new Set()).checkout
  const gate=canActivateDigital({checkout:confirmed,quote,lock,compliance:'CLEARED',contractExecuted:true,physicalBackingVerified:true,mode:'LIVE'})
  assert.equal(gate.eligible,true)
})

test('receipt and refund require confirmed payment',()=>{
  const {quote,checkout}=seed(false)
  const confirmed=applyPaymentEvent(checkout,{eventId:'evt-4',paymentStatus:'CONFIRMED',providerReference:'pay-4'},new Set()).checkout
  const receipt=createReceipt({orderId:'ord-1',checkout:confirmed,quote,taxAmount:0,shippingAmount:0})
  assert.equal(receipt.total,quote.paymentAmount)
  const refund=createRefundRequest({orderId:'ord-1',checkout:confirmed,amount:100,reason:'customer request'})
  assert.equal(refund.status,'REQUESTED')
})
