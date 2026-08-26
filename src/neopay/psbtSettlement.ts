import{buildNativeBitcoinPsbt}from'./psbtEngine'
import{validateNativeBitcoinPsbt}from'./psbtValidation'
import type{NativeBitcoinPlan}from'./nativeBitcoin'
import{runTransactionPreflight,type PreflightSummary}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'
import{clearPendingTransactionReview,registerBroadcastReceipt,setPendingTransactionReview}from'./receiptCenter'
import{signAndPushUniSatPsbt}from'./walletProviderRegistry'

export async function settleNativeBitcoinWithUniSat(plan:NativeBitcoinPlan,summary:PreflightSummary){
 const psbt=await buildNativeBitcoinPsbt(plan)
 const validation=validateNativeBitcoinPsbt(psbt,plan)
 const preflight=await runTransactionPreflight(plan.source,summary)
 const review=buildTransactionReview(plan.unsignedTxHex,{...summary,psbtValidated:validation.valid,psbtInputs:validation.inputs,psbtOutputs:validation.outputs},preflight)
 if(!requestTransactionApproval(review))throw new Error('Transaction approval cancelled.')
 setPendingTransactionReview(review)
 try{const result=await signAndPushUniSatPsbt(psbt.psbtHex);registerBroadcastReceipt(result.txid);return{...result,psbt,validation}}catch(e){clearPendingTransactionReview();throw e}
}
