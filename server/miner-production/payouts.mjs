import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const n=v=>Number(v||0)

export function validateBitcoinDestination(address){
  if(typeof address!=='string'||address.length<14||address.length>90) return false
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{10,}$/i.test(address)
}

export function createPayoutRequest({customerId,address,amountBtc,availableBtc,minimumBtc=0.00001,sourceLedger='HASHVAULT_VERIFIED'}){
  if(!customerId) throw new Error('CUSTOMER_REQUIRED')
  if(sourceLedger!=='HASHVAULT_VERIFIED') throw new Error('UNVERIFIED_LEDGER_BLOCKED')
  if(!validateBitcoinDestination(address)) throw new Error('INVALID_BITCOIN_DESTINATION')
  const amount=n(amountBtc), available=n(availableBtc), minimum=n(minimumBtc)
  if(amount<=0||amount<minimum) throw new Error('PAYOUT_BELOW_MINIMUM')
  if(amount>available) throw new Error('INSUFFICIENT_VERIFIED_BALANCE')
  return {id:`PAY-${crypto.randomUUID()}`,customerId,address,amountBtc:amount,sourceLedger,state:'REQUESTED',createdAt:now(),approvedAt:null,broadcastAt:null,confirmedAt:null,txid:null,confirmations:0}
}

export function approvePayout(request,{complianceApproved=false,addressVerified=false}){
  if(request.state!=='REQUESTED') throw new Error('PAYOUT_STATE_INVALID')
  if(!complianceApproved||!addressVerified) throw new Error('PAYOUT_APPROVAL_BLOCKED')
  return {...request,state:'APPROVED',approvedAt:now()}
}

export function markBroadcast(request,{txid}){
  if(request.state!=='APPROVED') throw new Error('PAYOUT_STATE_INVALID')
  if(!/^[0-9a-f]{64}$/i.test(txid||'')) throw new Error('INVALID_BITCOIN_TXID')
  return {...request,state:'BROADCAST',txid,broadcastAt:now()}
}

export function confirmPayout(request,{confirmations,requiredConfirmations=1}){
  if(request.state!=='BROADCAST'&&request.state!=='CONFIRMING') throw new Error('PAYOUT_STATE_INVALID')
  const c=n(confirmations), required=Math.max(1,n(requiredConfirmations))
  if(c<required) return {...request,state:'CONFIRMING',confirmations:c}
  return {...request,state:'CONFIRMED',confirmations:c,confirmedAt:now()}
}

export function createSettlementReceipt({payout,contractIds=[],ledgerEntryIds=[]}){
  if(payout?.state!=='CONFIRMED'||!payout.txid) throw new Error('CONFIRMED_PAYOUT_REQUIRED')
  const payload={receiptId:`RCP-${crypto.randomUUID()}`,customerId:payout.customerId,amountBtc:payout.amountBtc,address:payout.address,txid:payout.txid,confirmations:payout.confirmations,contractIds:[...contractIds],ledgerEntryIds:[...ledgerEntryIds],settledAt:payout.confirmedAt,issuedAt:now()}
  const integrityHash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  return {...payload,integrityHash,status:'FINAL'}
}

export function publicReceipt(receipt){
  if(!receipt||receipt.status!=='FINAL') throw new Error('FINAL_RECEIPT_REQUIRED')
  return {receiptId:receipt.receiptId,amountBtc:receipt.amountBtc,txid:receipt.txid,confirmations:receipt.confirmations,contractIds:receipt.contractIds,settledAt:receipt.settledAt,integrityHash:receipt.integrityHash,status:'FINAL'}
}
