import{buildNativeBitcoinPsbt}from'./psbtEngine'
import{validateNativeBitcoinPsbt}from'./psbtValidation'
import type{NativeBitcoinPlan}from'./nativeBitcoin'
import{runTransactionPreflight,type PreflightSummary}from'./preflight'
import{buildTransactionReview,requestTransactionApproval}from'./transactionReview'
import{clearPendingTransactionReview,registerBroadcastReceipt,setPendingTransactionReview}from'./receiptCenter'
import{signAndPushUniSatPsbt}from'./walletProviderRegistry'
import{getPsbtWalletAdapter}from'./psbtWalletAdapters'

async function prepare(plan:NativeBitcoinPlan,summary:PreflightSummary){const psbt=await buildNativeBitcoinPsbt(plan),validation=validateNativeBitcoinPsbt(psbt,plan),preflight=await runTransactionPreflight(plan.source,summary),review=buildTransactionReview(plan.unsignedTxHex,{...summary,psbtValidated:validation.valid,psbtInputs:validation.inputs,psbtOutputs:validation.outputs},preflight);if(!requestTransactionApproval(review))throw new Error('Transaction approval cancelled.');setPendingTransactionReview(review);return{psbt,validation}}
export async function settleNativeBitcoinWithUniSat(plan:NativeBitcoinPlan,summary:PreflightSummary){const{psbt,validation}=await prepare(plan,summary);try{const result=await signAndPushUniSatPsbt(psbt.psbtHex);registerBroadcastReceipt(result.txid);return{...result,psbt,validation,providerId:'unisat',providerName:'UniSat Wallet'}}catch(e){clearPendingTransactionReview();throw e}}
export async function settleNativeBitcoinWithPsbtAdapter(adapterId:string,plan:NativeBitcoinPlan,summary:PreflightSummary,address:string){const adapter=getPsbtWalletAdapter(adapterId);if(!adapter||!adapter.detected())throw new Error(`PSBT wallet adapter ${adapterId} is not available.`);if(address.toLowerCase()!==plan.source.toLowerCase())throw new Error('PSBT wallet address no longer matches the transaction source. Reconnect the wallet and rebuild the transaction.');const{psbt,validation}=await prepare(plan,summary);try{const result=await adapter.signAndBroadcast(psbt.psbtHex,address,psbt.inputs.length);return{...result,psbt,validation}}catch(e){clearPendingTransactionReview();throw e}}
