import crypto from 'node:crypto'
const now=()=>new Date().toISOString()
const clone=v=>structuredClone(v)

export function createMerchantLedger(){return new Map()}
const key=(m,a)=>`${m}::${a}`
export function getBalance(ledger,merchantId,asset){return clone(ledger.get(key(merchantId,asset))||{merchant_id:merchantId,asset,settled:0,reserved:0,pending:0,available:0})}
function putBalance(ledger,b){b.available=Number(b.settled)-Number(b.reserved);ledger.set(key(b.merchant_id,b.asset),clone(b));return clone(b)}

export function creditFinalPayment(ledger,{merchant_id,asset,amount,payment_id,settlement_evidence_ref,registry_evidence_ref=null}={}){
 if(!merchant_id||!asset||!payment_id||!settlement_evidence_ref)throw new TypeError('verified payment evidence required')
 const b=getBalance(ledger,merchant_id,asset);b.settled+=Number(amount||0);return {balance:putBalance(ledger,b),entry:{entry_id:`LED-${crypto.randomUUID()}`,type:'PAYMENT_CREDIT',merchant_id,asset,amount:Number(amount||0),payment_id,settlement_evidence_ref,registry_evidence_ref,posted_at:now()}}
}

export function holdReserve(ledger,{merchant_id,asset,amount,reason,reference}={}){
 const b=getBalance(ledger,merchant_id,asset),n=Number(amount||0);if(n<=0||b.available<n)throw new Error('insufficient_available_balance');b.reserved+=n;return {balance:putBalance(ledger,b),reserve:{reserve_id:`RSV-${crypto.randomUUID()}`,merchant_id,asset,amount:n,reason,reference,status:'HELD',created_at:now()}}
}

export function releaseReserve(ledger,reserve){
 const b=getBalance(ledger,reserve.merchant_id,reserve.asset);b.reserved=Math.max(0,b.reserved-Number(reserve.amount||0));return {balance:putBalance(ledger,b),reserve:{...clone(reserve),status:'RELEASED',released_at:now()}}
}

export function createSettlementBatch({batch_id,merchant_id,asset,payment_ids=[],gross_amount,fees=0,reserves=0}={}){
 if(!batch_id||!merchant_id||!asset)throw new TypeError('batch_id, merchant_id and asset required')
 const gross=Number(gross_amount||0),fee=Number(fees||0),reserve=Number(reserves||0)
 return {batch_id:String(batch_id),merchant_id:String(merchant_id),asset:String(asset).toUpperCase(),payment_ids:[...payment_ids],gross_amount:gross,fees:fee,reserves:reserve,net_amount:gross-fee-reserve,state:'OPEN',created_at:now()}
}

export function reconcileBatch(batch,{verifiedPaymentIds=[],ledgerBalance}={}){
 const missing=batch.payment_ids.filter(id=>!verifiedPaymentIds.includes(id))
 if(missing.length)return {...clone(batch),state:'OPEN',reconciliation:{ok:false,missing}}
 if(Number(ledgerBalance?.available||0)<Number(batch.net_amount||0))return {...clone(batch),state:'OPEN',reconciliation:{ok:false,reason:'insufficient_available_balance'}}
 return {...clone(batch),state:'RECONCILED',reconciliation:{ok:true,missing:[]},reconciled_at:now()}
}

export function createPayout({payout_id,batch,destination,signer='NEOMASK_OR_EXTERNAL_SIGNER'}={}){
 if(batch?.state!=='RECONCILED')throw new Error('reconciled_batch_required')
 if(!payout_id||!destination)throw new TypeError('payout_id and destination required')
 return {payout_id:String(payout_id),batch_id:batch.batch_id,merchant_id:batch.merchant_id,asset:batch.asset,amount:batch.net_amount,destination:String(destination),signer,state:'REQUESTED',created_at:now(),private_key_stored:false}
}

export function approvePayout(payout,{approved=false}={}){
 return {...clone(payout),state:approved?'APPROVED':'REQUESTED',approved_at:approved?now():null}
}

export function recordPayoutEvidence(payout,{txid,confirmed=false}={}){
 if(!['APPROVED','SIGNED','BROADCAST'].includes(payout?.state))throw new Error('approved_payout_required')
 if(!txid)throw new TypeError('txid required')
 return {...clone(payout),txid:String(txid),state:confirmed?'CONFIRMED':'BROADCAST',confirmed_at:confirmed?now():null}
}

export function createRefund({refund_id,merchant_id,payment_id,asset,amount,destination,original_payment_final=false}={}){
 if(!original_payment_final)throw new Error('original_final_payment_required')
 if(!refund_id||!merchant_id||!payment_id||!asset||!destination)throw new TypeError('refund fields required')
 return {refund_id:String(refund_id),merchant_id:String(merchant_id),payment_id:String(payment_id),asset:String(asset),amount:Number(amount||0),destination:String(destination),state:'REQUESTED',created_at:now()}
}

export function createDispute({dispute_id,merchant_id,payment_id,asset,amount,reason}={}){
 if(!dispute_id||!merchant_id||!payment_id)throw new TypeError('dispute fields required')
 return {dispute_id:String(dispute_id),merchant_id:String(merchant_id),payment_id:String(payment_id),asset:String(asset||'BTC'),amount:Number(amount||0),reason:reason||null,state:'OPEN',created_at:now()}
}

export function treasurySnapshot({ledger,batches=[],payouts=[],refunds=[],disputes=[],reserves=[]}={}){
 return {estate:'Global Vast Estate',fabric:'NEO Counter Merchant Acquiring & Settlement Treasury',balances:[...ledger.values()].map(clone),batches:{total:batches.length,reconciled:batches.filter(x=>x.state==='RECONCILED').length},payouts:{total:payouts.length,confirmed:payouts.filter(x=>x.state==='CONFIRMED').length},refunds:{total:refunds.length},disputes:{open:disputes.filter(x=>!String(x.state).startsWith('RESOLVED')).length},reserves:{held:reserves.filter(x=>x.status==='HELD').length},private_keys_stored:false,generated_at:now()}
}
