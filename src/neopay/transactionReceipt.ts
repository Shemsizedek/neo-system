import{getBitcoinTransactionStatus}from'./bitcoinService'
import type{TransactionReview}from'./transactionReview'

export type ReceiptState='submitted'|'mempool'|'confirmed'|'failed'
export type TransactionReceipt={txid:string;state:ReceiptState;confirmations:number;blockHeight?:number;submittedAt:string;verifiedAt?:string;review:TransactionReview;error?:string}

export function createTransactionReceipt(txid:string,review:TransactionReview):TransactionReceipt{
 return{txid,state:'submitted',confirmations:0,submittedAt:new Date().toISOString(),review}
}

export async function verifyTransactionReceipt(receipt:TransactionReceipt):Promise<TransactionReceipt>{
 try{
  const status=await getBitcoinTransactionStatus(receipt.txid)
  return{...receipt,state:status.confirmed?'confirmed':'mempool',confirmations:status.confirmations,blockHeight:status.blockHeight,verifiedAt:new Date().toISOString(),error:undefined}
 }catch(e:any){
  return{...receipt,state:'submitted',verifiedAt:new Date().toISOString(),error:e?.message||'Network verification pending.'}
 }
}

export function receiptSummary(r:TransactionReceipt){
 const state=r.state==='confirmed'?`Confirmed${r.confirmations?` · ${r.confirmations} confirmation${r.confirmations===1?'':'s'}`:''}`:r.state==='mempool'?'In Bitcoin mempool':r.state==='failed'?'Broadcast failed':'Submitted · verification pending'
 return`NEOpay receipt · ${state} · ${r.txid}`
}
