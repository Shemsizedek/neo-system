import crypto from 'node:crypto'
import {assertNoSecrets} from './composer.mjs'

const TXID_RE=/^[0-9a-fA-F]{64}$/
const ASSET_RE=/^[A-Z][A-Z0-9._-]{0,63}$/
const DEFAULT_CONFIRMATIONS=Math.max(1,Number(process.env.NEO_TELLER_REQUIRED_CONFIRMATIONS||3))

function canonical(value){
  if(Array.isArray(value)) return value.map(canonical)
  if(value&&typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]))
  return value
}

export function buildSettlementRecord(input={}){
  assertNoSecrets(input)
  const transactionId=String(input.transactionId||'').trim()
  const txid=String(input.txid||'').trim().toLowerCase()
  const asset=String(input.asset||'').trim().toUpperCase()
  const amount=Number(input.amount)
  const debitAccount=String(input.debitAccount||'').trim()
  const creditAccount=String(input.creditAccount||'').trim()
  const confirmations=Math.max(0,Number(input.confirmations||0))
  const requiredConfirmations=Math.max(1,Number(input.requiredConfirmations||DEFAULT_CONFIRMATIONS))
  if(!transactionId) throw new Error('MISSING_TRANSACTION_ID')
  if(!TXID_RE.test(txid)) throw new Error('INVALID_TXID')
  if(!ASSET_RE.test(asset)) throw new Error('INVALID_ASSET')
  if(!Number.isFinite(amount)||amount<=0) throw new Error('INVALID_AMOUNT')
  if(!debitAccount||!creditAccount||debitAccount===creditAccount) throw new Error('INVALID_LEDGER_ACCOUNTS')
  const ledgerEntries=[
    {id:`LE-${transactionId}-D`,transactionId,account:debitAccount,asset,debit:amount,credit:0,reference:txid},
    {id:`LE-${transactionId}-C`,transactionId,account:creditAccount,asset,debit:0,credit:amount,reference:txid}
  ]
  const balanced=ledgerEntries.reduce((s,e)=>s+e.debit-e.credit,0)===0
  if(!balanced) throw new Error('UNBALANCED_LEDGER')
  const status=confirmations>=requiredConfirmations?'SETTLED':'SETTLEMENT_PENDING'
  return {transactionId,txid,asset,amount,confirmations,requiredConfirmations,status,ledgerEntries,balanced}
}

export function buildReceipt(record,extra={}){
  const issuedAt=new Date().toISOString()
  const payload={version:'NEO_TELLER_RECEIPT_V1',issuedAt,transactionId:record.transactionId,txid:record.txid,asset:record.asset,amount:record.amount,status:record.status,confirmations:record.confirmations,requiredConfirmations:record.requiredConfirmations,ledgerEntries:record.ledgerEntries,...extra}
  const canonicalPayload=JSON.stringify(canonical(payload))
  const receiptHash=crypto.createHash('sha256').update(canonicalPayload).digest('hex')
  return {...payload,receiptHash,integrity:{algorithm:'SHA-256',canonical:true}}
}

export function verifyReceipt(receipt={}){
  const {receiptHash,integrity,...payload}=receipt
  if(!receiptHash||integrity?.algorithm!=='SHA-256') return false
  const expected=crypto.createHash('sha256').update(JSON.stringify(canonical(payload))).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(String(receiptHash),'hex'))
}
