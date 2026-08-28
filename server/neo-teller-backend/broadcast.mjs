import crypto from 'node:crypto'
import {assertNoSecrets} from './composer.mjs'

const HEX_RE=/^[0-9a-fA-F]+$/
const TXID_RE=/^[0-9a-fA-F]{64}$/

export function validateBroadcastIntent(input={}){
  assertNoSecrets(input)
  const signedTransaction=String(input.signedTransaction||'').trim()
  const intentId=String(input.intentId||'').trim()
  const fingerprint=String(input.fingerprint||'').trim().toLowerCase()
  const confirmation=String(input.confirmation||'').trim()
  if(!intentId) throw new Error('MISSING_INTENT_ID')
  if(signedTransaction.length<20||signedTransaction.length%2!==0||!HEX_RE.test(signedTransaction)) throw new Error('INVALID_SIGNED_TRANSACTION')
  const computed=crypto.createHash('sha256').update(signedTransaction).digest('hex')
  if(fingerprint && fingerprint!==computed) throw new Error('SIGNED_TRANSACTION_FINGERPRINT_MISMATCH')
  if(confirmation!=='BROADCAST_SIGNED_TRANSACTION') throw new Error('EXPLICIT_BROADCAST_CONFIRMATION_REQUIRED')
  return {intentId,signedTransaction,fingerprint:computed}
}

export function normalizeBroadcastReceipt(input,txid,source){
  if(!TXID_RE.test(String(txid||''))) throw new Error('INVALID_BROADCAST_TXID')
  return {
    intentId:input.intentId,
    txid:String(txid).toLowerCase(),
    fingerprint:input.fingerprint,
    status:'BROADCAST',
    network:'BITCOIN',
    source,
    broadcastAt:new Date().toISOString(),
    tracking:{state:'MEMPOOL_OR_PENDING',confirmations:0}
  }
}

export function normalizeTransactionStatus(txid,payload={},tipHeight){
  if(!TXID_RE.test(String(txid||''))) throw new Error('INVALID_TXID')
  const confirmed=Boolean(payload.confirmed)
  const blockHeight=Number.isFinite(Number(payload.block_height))?Number(payload.block_height):undefined
  const tip=Number.isFinite(Number(tipHeight))?Number(tipHeight):undefined
  const confirmations=confirmed&&blockHeight!==undefined&&tip!==undefined?Math.max(1,tip-blockHeight+1):0
  return {
    txid:String(txid).toLowerCase(),
    state:confirmed?'CONFIRMED':'MEMPOOL_OR_PENDING',
    confirmed,
    confirmations,
    blockHeight,
    blockHash:payload.block_hash,
    blockTime:payload.block_time
  }
}
