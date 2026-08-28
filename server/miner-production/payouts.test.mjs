import test from 'node:test'
import assert from 'node:assert/strict'
import {createPayoutRequest,approvePayout,markBroadcast,confirmPayout,createSettlementReceipt,publicReceipt} from './payouts.mjs'

test('verified HashVault payout progresses to final receipt',()=>{
  let p=createPayoutRequest({customerId:'C1',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:0.001,availableBtc:0.002,minimumBtc:0.0001})
  p=approvePayout(p,{complianceApproved:true,addressVerified:true})
  p=markBroadcast(p,{txid:'a'.repeat(64)})
  p=confirmPayout(p,{confirmations:2,requiredConfirmations:1})
  assert.equal(p.state,'CONFIRMED')
  const r=createSettlementReceipt({payout:p,contractIds:['CMC-1'],ledgerEntryIds:['LED-1']})
  const pub=publicReceipt(r)
  assert.equal(pub.txid,'a'.repeat(64))
  assert.equal(pub.status,'FINAL')
  assert.ok(pub.integrityHash)
})

test('unverified and overdrawn payouts are blocked',()=>{
  assert.throws(()=>createPayoutRequest({customerId:'C1',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:1,availableBtc:2,sourceLedger:'ESTIMATED'}),/UNVERIFIED_LEDGER_BLOCKED/)
  assert.throws(()=>createPayoutRequest({customerId:'C1',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:3,availableBtc:2}),/INSUFFICIENT_VERIFIED_BALANCE/)
})

test('broadcast requires a valid-looking txid and confirmation threshold',()=>{
  let p=createPayoutRequest({customerId:'C1',address:'bc1qexampleaddress0000000000000000000000000',amountBtc:0.001,availableBtc:0.002})
  p=approvePayout(p,{complianceApproved:true,addressVerified:true})
  assert.throws(()=>markBroadcast(p,{txid:'bad'}),/INVALID_BITCOIN_TXID/)
  p=markBroadcast(p,{txid:'b'.repeat(64)})
  p=confirmPayout(p,{confirmations:0,requiredConfirmations:2})
  assert.equal(p.state,'CONFIRMING')
})
