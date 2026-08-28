import test from 'node:test'
import assert from 'node:assert/strict'
import {eligibleRails,selectPaymentRail,assertLiveRail,paymentRailsFromEnv,worldCurrencyCodes} from './paymentRails.mjs'
import {createCesPaymentRequest,normalizeCesTradeEvent,reconcileCesPayment,cesLiveReadiness} from './cesAdapter.mjs'
import {normalizeBitcoinPayment,normalizeLightningPayment,normalizeCounterpartyPayment} from './blockchainAdapters.mjs'

test('selectPaymentRail fails closed when no enabled rail exists',()=>{
  assert.equal(selectPaymentRail({currency:'USD'}).ok,false)
})

test('eligibleRails and live assertion require enabled configured providers',()=>{
  const rails=[{id:'x',type:'WIRE',currencies:['USD'],status:'ENABLED',provider:'BANK_A',jurisdictions:['GLOBAL']}]
  assert.equal(eligibleRails({currency:'USD',rails}).length,1)
  assert.equal(assertLiveRail(rails[0]),true)
})

test('production rails load enabled currencies and providers from environment',()=>{
  const rails=paymentRailsFromEnv({CARD_ENABLED:'true',CARD_PROVIDER:'ACQUIRER_A',PAYMENT_FIAT_CURRENCIES:'USD,EUR,JPY',CARD_JURISDICTIONS:'GLOBAL'})
  const card=rails.find(r=>r.type==='CARD')
  assert.equal(card.status,'ENABLED')
  assert.equal(card.provider,'ACQUIRER_A')
  assert.deepEqual(card.currencies,['USD','EUR','JPY'])
  assert.ok(worldCurrencyCodes.includes('USD'))
})

test('CES payment reconciles only matching posted trade',()=>{
  const request=createCesPaymentRequest({orderId:'o1',accountId:'BUYER',exchangeId:'EX1',amount:144})
  const trade=normalizeCesTradeEvent({tradeId:'t1',exchangeId:'EX1',debitAccount:'BUYER',creditAccount:'NEO',amount:144,status:'POSTED'})
  assert.equal(reconcileCesPayment(request,trade).matched,true)
})

test('CES live readiness requires full secure configuration',()=>{
  assert.equal(cesLiveReadiness({enabled:true,baseUrl:'https://example.test',exchangeId:'EX1',accountId:'A1',credentialRef:'secret://ces'}).ready,true)
  assert.equal(cesLiveReadiness({enabled:true,baseUrl:'http://example.test',exchangeId:'EX1',accountId:'A1',credentialRef:'secret://ces'}).ready,false)
})

test('blockchain adapters normalize provider events',()=>{
  assert.equal(normalizeBitcoinPayment({txid:'abc',amountBtc:0.01,confirmations:1}).status,'CONFIRMED')
  assert.equal(normalizeLightningPayment({paymentHash:'ph',amountSats:1000,settled:true}).status,'CONFIRMED')
  assert.equal(normalizeCounterpartyPayment({txHash:'x',asset:'xcp',quantity:9,confirmed:true}).asset,'XCP')
})
