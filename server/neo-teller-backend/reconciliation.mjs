import crypto from 'node:crypto'
import {assertNoSecrets} from './composer.mjs'

function num(v,name){const n=Number(v);if(!Number.isFinite(n))throw new Error(`INVALID_${name}`);return n}

export function reconcileMachine(input={}){
  assertNoSecrets(input)
  const tellerId=String(input.tellerId||'').trim()
  if(!tellerId) throw new Error('MISSING_TELLER_ID')
  const openingCash=num(input.openingCash,'OPENING_CASH')
  const cashLoaded=num(input.cashLoaded||0,'CASH_LOADED')
  const cashDispensed=num(input.cashDispensed||0,'CASH_DISPENSED')
  const cashAccepted=num(input.cashAccepted||0,'CASH_ACCEPTED')
  const countedCash=num(input.countedCash,'COUNTED_CASH')
  const ledgerCashNet=num(input.ledgerCashNet||0,'LEDGER_CASH_NET')
  const expectedCash=openingCash+cashLoaded+cashAccepted-cashDispensed+ledgerCashNet
  const variance=Number((countedCash-expectedCash).toFixed(2))
  const status=Math.abs(variance)<0.01?'BALANCED':variance<0?'SHORTAGE':'OVERAGE'
  const exception=status==='BALANCED'?null:{type:status,amount:Math.abs(variance),requiresReview:true}
  const report={tellerId,openingCash,cashLoaded,cashAccepted,cashDispensed,ledgerCashNet,expectedCash,countedCash,variance,status,exception,reconciledAt:new Date().toISOString()}
  const reconciliationHash=crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex')
  return {...report,reconciliationHash}
}

export function reconcileSettlement(input={}){
  assertNoSecrets(input)
  const txid=String(input.txid||'').trim().toLowerCase()
  const ledgerTransactionId=String(input.ledgerTransactionId||'').trim()
  const blockchainAmount=num(input.blockchainAmount,'BLOCKCHAIN_AMOUNT')
  const ledgerAmount=num(input.ledgerAmount,'LEDGER_AMOUNT')
  if(!/^[0-9a-f]{64}$/.test(txid)) throw new Error('INVALID_TXID')
  if(!ledgerTransactionId) throw new Error('MISSING_LEDGER_TRANSACTION_ID')
  const variance=Number((ledgerAmount-blockchainAmount).toFixed(8))
  return {txid,ledgerTransactionId,blockchainAmount,ledgerAmount,variance,status:Math.abs(variance)<1e-8?'MATCHED':'MISMATCH',requiresReview:Math.abs(variance)>=1e-8}
}

export function buildOperatorReport(input={}){
  assertNoSecrets(input)
  const machine=reconcileMachine(input.machine||{})
  const settlements=(input.settlements||[]).map(reconcileSettlement)
  const exceptions=[...(machine.exception?[machine.exception]:[]),...settlements.filter(x=>x.requiresReview).map(x=>({type:'SETTLEMENT_MISMATCH',txid:x.txid,amount:Math.abs(x.variance),requiresReview:true}))]
  return {reportId:`REC-${crypto.randomUUID()}`,machine,settlements,exceptions,overallStatus:exceptions.length?'EXCEPTION':'BALANCED',generatedAt:new Date().toISOString()}
}
