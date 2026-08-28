import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {normalizeBroadcastReceipt,normalizeTransactionStatus,validateBroadcastIntent} from './broadcast.mjs'

const signed='0200000001deadbeefcafebabefeedface0000000000000000000000000000000000000000'

test('requires explicit broadcast confirmation',()=>{
  assert.throws(()=>validateBroadcastIntent({intentId:'intent-1',signedTransaction:signed}),/EXPLICIT_BROADCAST_CONFIRMATION_REQUIRED/)
})

test('rejects fingerprint mismatch',()=>{
  assert.throws(()=>validateBroadcastIntent({intentId:'intent-1',signedTransaction:signed,fingerprint:'00'.repeat(32),confirmation:'BROADCAST_SIGNED_TRANSACTION'}),/FINGERPRINT_MISMATCH/)
})

test('accepts signed transaction with explicit confirmation',()=>{
  const fingerprint=crypto.createHash('sha256').update(signed).digest('hex')
  const out=validateBroadcastIntent({intentId:'intent-1',signedTransaction:signed,fingerprint,confirmation:'BROADCAST_SIGNED_TRANSACTION'})
  assert.equal(out.fingerprint,fingerprint)
})

test('normalizes broadcast and confirmation status',()=>{
  const input={intentId:'intent-1',fingerprint:'ab'.repeat(32)}
  const txid='cd'.repeat(32)
  const receipt=normalizeBroadcastReceipt(input,txid,'https://bitcoin.example/api')
  assert.equal(receipt.status,'BROADCAST')
  const status=normalizeTransactionStatus(txid,{confirmed:true,block_height:900},902)
  assert.equal(status.state,'CONFIRMED')
  assert.equal(status.confirmations,3)
})
