import test from 'node:test'
import assert from 'node:assert/strict'
import {buildOperatorReport,reconcileMachine,reconcileSettlement} from './reconciliation.mjs'

test('machine reconciliation balances',()=>{
  const r=reconcileMachine({tellerId:'NT-1',openingCash:1000,cashLoaded:500,cashAccepted:200,cashDispensed:300,ledgerCashNet:-100,countedCash:1300})
  assert.equal(r.expectedCash,1300)
  assert.equal(r.status,'BALANCED')
  assert.equal(r.exception,null)
})

test('machine shortage becomes explicit exception',()=>{
  const r=reconcileMachine({tellerId:'NT-1',openingCash:1000,countedCash:950})
  assert.equal(r.status,'SHORTAGE')
  assert.equal(r.exception.amount,50)
  assert.equal(r.exception.requiresReview,true)
})

test('settlement mismatch is detected',()=>{
  const txid='a'.repeat(64)
  const r=reconcileSettlement({txid,ledgerTransactionId:'TX-1',blockchainAmount:1,ledgerAmount:0.9})
  assert.equal(r.status,'MISMATCH')
  assert.equal(r.requiresReview,true)
})

test('operator report aggregates exceptions',()=>{
  const report=buildOperatorReport({machine:{tellerId:'NT-1',openingCash:1000,countedCash:990},settlements:[{txid:'b'.repeat(64),ledgerTransactionId:'TX-2',blockchainAmount:2,ledgerAmount:1.5}]})
  assert.equal(report.overallStatus,'EXCEPTION')
  assert.equal(report.exceptions.length,2)
})
