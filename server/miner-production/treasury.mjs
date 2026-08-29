import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const n=v=>Number(v||0)

export const APPROVAL_TIERS={
  STANDARD:{maxBtc:0.01,requiredApprovals:1},
  ELEVATED:{maxBtc:0.1,requiredApprovals:2},
  TREASURY:{maxBtc:Infinity,requiredApprovals:3}
}

export function treasuryPolicy(input={}){
  return {
    dailyLimitBtc:n(input.dailyLimitBtc||0.25),
    hotWalletFloorBtc:n(input.hotWalletFloorBtc||0.02),
    hotWalletTargetBtc:n(input.hotWalletTargetBtc||0.1),
    coldReserveMinimumBtc:n(input.coldReserveMinimumBtc||0.5),
    requiredConfirmations:Math.max(1,n(input.requiredConfirmations||1)),
    signingMode:input.signingMode||'EXTERNAL_SIGNER'
  }
}

export function classifyApprovalTier(amountBtc){
  const amount=n(amountBtc)
  if(amount<=APPROVAL_TIERS.STANDARD.maxBtc) return {tier:'STANDARD',...APPROVAL_TIERS.STANDARD}
  if(amount<=APPROVAL_TIERS.ELEVATED.maxBtc) return {tier:'ELEVATED',...APPROVAL_TIERS.ELEVATED}
  return {tier:'TREASURY',...APPROVAL_TIERS.TREASURY}
}

export function evaluateTreasuryPayout({request,policy,hotWalletBalanceBtc,dailyBroadcastBtc=0,approvals=[]}){
  if(request?.state!=='APPROVED') throw new Error('APPROVED_PAYOUT_REQUIRED')
  const p=treasuryPolicy(policy)
  const tier=classifyApprovalTier(request.amountBtc)
  const uniqueApprovals=new Set((approvals||[]).filter(Boolean))
  const projectedDaily=n(dailyBroadcastBtc)+n(request.amountBtc)
  if(projectedDaily>p.dailyLimitBtc) throw new Error('DAILY_PAYOUT_LIMIT_EXCEEDED')
  if(uniqueApprovals.size<tier.requiredApprovals) throw new Error('INSUFFICIENT_TREASURY_APPROVALS')
  const hot=n(hotWalletBalanceBtc)
  if(hot<n(request.amountBtc)+p.hotWalletFloorBtc) throw new Error('HOT_WALLET_LIQUIDITY_INSUFFICIENT')
  return {ok:true,tier:tier.tier,requiredApprovals:tier.requiredApprovals,approvalCount:uniqueApprovals.size,projectedDailyBtc:projectedDaily,projectedHotBalanceBtc:hot-n(request.amountBtc),signingMode:p.signingMode,evaluatedAt:now()}
}

export function buildUnsignedPayout({request,feeRateSatVb=5,changeAddressRef='wallet://hot/change'}){
  if(request?.state!=='APPROVED') throw new Error('APPROVED_PAYOUT_REQUIRED')
  if(n(feeRateSatVb)<=0) throw new Error('INVALID_FEE_RATE')
  return {intentId:`TXI-${crypto.randomUUID()}`,payoutId:request.id,destination:request.address,amountBtc:n(request.amountBtc),feeRateSatVb:n(feeRateSatVb),changeAddressRef,signingRequired:true,rawTransaction:null,privateKeyIncluded:false,createdAt:now()}
}

export function assertExternalSignerResult({intent,signedTransaction,txid}){
  if(!intent?.signingRequired) throw new Error('INVALID_SIGNING_INTENT')
  if(typeof signedTransaction!=='string'||signedTransaction.length<20) throw new Error('SIGNED_TRANSACTION_REQUIRED')
  if(!/^[0-9a-f]{64}$/i.test(txid||'')) throw new Error('INVALID_BITCOIN_TXID')
  return {intentId:intent.intentId,payoutId:intent.payoutId,txid,signedTransactionPresent:true,privateKeyIncluded:false,signedAt:now()}
}

export function coldReserveAction({hotWalletBalanceBtc,policy}){
  const p=treasuryPolicy(policy),hot=n(hotWalletBalanceBtc)
  if(hot<p.hotWalletFloorBtc) return {action:'REFILL_HOT_FROM_COLD_APPROVAL_REQUIRED',amountBtc:Math.max(0,p.hotWalletTargetBtc-hot)}
  if(hot>p.hotWalletTargetBtc*2) return {action:'SWEEP_EXCESS_TO_COLD',amountBtc:Math.max(0,hot-p.hotWalletTargetBtc)}
  return {action:'NONE',amountBtc:0}
}
