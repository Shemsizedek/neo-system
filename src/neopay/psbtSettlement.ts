import{buildNativeBitcoinPsbt}from'./psbtEngine'
import type{NativeBitcoinPlan}from'./nativeBitcoin'
import{runTransactionPreflight,type PreflightSummary}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'
import{clearPendingTransactionReview,registerBroadcastReceipt,setPendingTransactionReview}from'./receiptCenter'
import{signAndPushUniSatPsbt}from'./walletProviderRegistry'

export async function settleNativeBitcoinWithUniSat(plan:NativeBitcoinPlan,summary:PreflightSummary){
 const psbt=await buildNativeBitcoinPsbt(plan)
 const preflight=await runTransactionPreflight(plan.source,summary)
 const review=buildTransactionReview(plan.unsignedTxHex,summary,preflight)
 if(!requestTransactionApproval(review))throw new Error('Transaction approval cancelled.')
 setPendingTransactionReview(review)
 try{const result=await signAndPushUniSatPsbt(psbt.psbtHex);registerBroadcastReceipt(result.txid);return{...result,psbt}}catch(e){clearPendingTransactionReview();throw e}
}
