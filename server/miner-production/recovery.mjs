import crypto from 'node:crypto'

const now=()=>new Date().toISOString()

export const RECOVERY_ACTIONS={
  NONE:'NONE',
  SYNC_CHAIN:'SYNC_CHAIN',
  FINALIZE_RECEIPT:'FINALIZE_RECEIPT',
  HOLD_FOR_OPERATOR:'HOLD_FOR_OPERATOR',
  RESUME_SIGNING:'RESUME_SIGNING'
}

export function classifyRecoveryCase({payout,finalized,receipt}){
  if(!payout?.id) throw new Error('PAYOUT_REQUIRED')
  if(receipt?.status==='FINAL') return {action:RECOVERY_ACTIONS.NONE,reason:'FINAL_RECEIPT_EXISTS'}
  if(payout.state==='CONFIRMED'&&payout.txid) return {action:RECOVERY_ACTIONS.FINALIZE_RECEIPT,reason:'CONFIRMED_WITHOUT_RECEIPT'}
  if(['BROADCAST','CONFIRMING'].includes(payout.state)&&payout.txid) return {action:RECOVERY_ACTIONS.SYNC_CHAIN,reason:'CHAIN_STATE_REQUIRED'}
  if(payout.state==='APPROVED'&&finalized?.complete===true&&finalized?.hex) return {action:RECOVERY_ACTIONS.HOLD_FOR_OPERATOR,reason:'FINALIZED_TX_WITHOUT_RECORDED_TXID'}
  if(payout.state==='APPROVED') return {action:RECOVERY_ACTIONS.RESUME_SIGNING,reason:'APPROVED_NOT_BROADCAST'}
  return {action:RECOVERY_ACTIONS.NONE,reason:'NO_RECOVERY_REQUIRED'}
}

export function createRecoveryIncident({payoutId,reason,detail=null,severity='HIGH'}){
  return {id:`INC-${crypto.randomUUID()}`,payoutId,severity,reason,detail,state:'OPEN',createdAt:now(),resolvedAt:null}
}

export async function inspectPayoutRecovery({payout,finalized=null,receipt=null,transactionStatus}){
  const classification=classifyRecoveryCase({payout,finalized,receipt})
  if(classification.action!==RECOVERY_ACTIONS.SYNC_CHAIN) return {...classification,payoutId:payout.id,chain:null}
  if(typeof transactionStatus!=='function') throw new Error('TRANSACTION_STATUS_REQUIRED')
  try{
    const chain=await transactionStatus(payout.txid)
    return {...classification,payoutId:payout.id,chain}
  }catch(error){
    return {action:RECOVERY_ACTIONS.HOLD_FOR_OPERATOR,reason:'CHAIN_LOOKUP_AMBIGUOUS',payoutId:payout.id,chain:null,error:String(error?.message||error)}
  }
}

export async function runRecoverySweep({payouts=[],finalizedTransactions=[],receipts=[],transactionStatus}){
  const finalizedByPayout=new Map(finalizedTransactions.map(v=>[v.payoutId,v]))
  const receiptByTxid=new Map(receipts.filter(r=>r.txid).map(r=>[r.txid,r]))
  const results=[]
  for(const payout of payouts){
    if(!['APPROVED','BROADCAST','CONFIRMING','CONFIRMED'].includes(payout.state)) continue
    results.push(await inspectPayoutRecovery({payout,finalized:finalizedByPayout.get(payout.id)||null,receipt:payout.txid?receiptByTxid.get(payout.txid)||null:null,transactionStatus}))
  }
  return {checked:results.length,results,generatedAt:now()}
}
