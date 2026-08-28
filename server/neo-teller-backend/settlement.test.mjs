import test from 'node:test'
import assert from 'node:assert/strict'
import {buildReceipt,buildSettlementRecord,verifyReceipt} from './settlement.mjs'

const txid='a'.repeat(64)

test('keeps transaction pending below confirmation policy',()=>{
  const r=buildSettlementRecord({transactionId:'NT-1',txid,asset:'XCP',amount:10,debitAccount:'customer',creditAccount:'network',confirmations:1,requiredConfirmations:3})
  assert.equal(r.status,'SETTLEMENT_PENDING')
  assert.equal(r.balanced,true)
})

test('settles only when confirmation policy is satisfied',()=>{
  const r=buildSettlementRecord({transactionId:'NT-2',txid,asset:'NOMNI',amount:25,debitAccount:'customer',creditAccount:'network',confirmations:3,requiredConfirmations:3})
  assert.equal(r.status,'SETTLED')
})

test('receipt hash verifies and detects tampering',()=>{
  const r=buildSettlementRecord({transactionId:'NT-3',txid,asset:'BTC',amount:0.01,debitAccount:'customer',creditAccount:'network',confirmations:6,requiredConfirmations:3})
  const receipt=buildReceipt(r,{direction:'WITHDRAWAL'})
  assert.equal(verifyReceipt(receipt),true)
  assert.equal(verifyReceipt({...receipt,amount:999}),false)
})

test('rejects secret-bearing settlement request',()=>{
  assert.throws(()=>buildSettlementRecord({transactionId:'NT-4',txid,asset:'XCP',amount:1,debitAccount:'a',creditAccount:'b',privateKey:'nope'}),/FORBIDDEN_SECRET_FIELD/)
})
