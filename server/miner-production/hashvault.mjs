import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const n=v=>Number(v||0)

export function reconcilePoolPayout({payout,verifiedShares=[]}){
  if(!payout?.payoutId||!payout?.poolId||!payout?.txid) throw new Error('POOL_PAYOUT_IDENTITY_REQUIRED')
  if(payout.confirmed!==true) throw new Error('POOL_PAYOUT_UNCONFIRMED')
  if(payout.simulation===true) throw new Error('SIMULATION_PAYOUT_BLOCKED')
  const eligible=verifiedShares.filter(s=>s?.accepted===true&&s?.verified===true&&s?.accountingEligible===true&&s.poolId===payout.poolId&&s.contractId)
  if(!eligible.length) throw new Error('NO_VERIFIED_SHARES_FOR_PAYOUT')
  const totalDifficulty=eligible.reduce((sum,s)=>sum+n(s.difficulty),0)
  if(totalDifficulty<=0) throw new Error('INVALID_SHARE_DIFFICULTY')
  const payoutBtc=n(payout.amountBtc)
  if(payoutBtc<=0) throw new Error('INVALID_POOL_PAYOUT')
  const byContract=new Map()
  for(const share of eligible){
    const row=byContract.get(share.contractId)||{contractId:share.contractId,difficulty:0,shareIds:[]}
    row.difficulty+=n(share.difficulty);row.shareIds.push(share.shareId);byContract.set(share.contractId,row)
  }
  const attributions=[...byContract.values()].map(row=>({
    attributionId:`ATTR-${crypto.randomUUID()}`,
    payoutId:payout.payoutId,
    poolId:payout.poolId,
    txid:payout.txid,
    contractId:row.contractId,
    shareIds:row.shareIds,
    difficulty:row.difficulty,
    difficultyRatio:row.difficulty/totalDifficulty,
    grossBtc:payoutBtc*(row.difficulty/totalDifficulty),
    state:'RECONCILED',
    reconciledAt:now()
  }))
  return {payoutId:payout.payoutId,poolId:payout.poolId,txid:payout.txid,amountBtc:payoutBtc,confirmed:true,state:'RECONCILED',verifiedShareCount:eligible.length,totalDifficulty,attributions,reconciledAt:now()}
}

export function createHashVaultCredit({attribution,customerId,poolFeePct=0,serviceFeePct=0,electricityFeeBtc=0}){
  if(attribution?.state!=='RECONCILED'||!attribution.contractId) throw new Error('RECONCILED_ATTRIBUTION_REQUIRED')
  if(!customerId) throw new Error('CUSTOMER_ID_REQUIRED')
  const gross=n(attribution.grossBtc)
  const poolFee=Math.max(0,gross*(n(poolFeePct)/100))
  const afterPool=Math.max(0,gross-poolFee)
  const serviceFee=Math.max(0,afterPool*(n(serviceFeePct)/100))
  const electricityFee=Math.max(0,n(electricityFeeBtc))
  const net=Math.max(0,afterPool-serviceFee-electricityFee)
  if(net<=0) throw new Error('NON_POSITIVE_NET_CREDIT')
  return {entryId:`HV-${crypto.randomUUID()}`,customerId,contractId:attribution.contractId,payoutId:attribution.payoutId,txid:attribution.txid,type:'MINING_CREDIT',grossBtc:gross,poolFeeBtc:poolFee,serviceFeeBtc:serviceFee,electricityFeeBtc:electricityFee,netBtc:net,state:'POSTED',sourceAttributionId:attribution.attributionId,postedAt:now()}
}

export function hashVaultSnapshot(entries=[]){
  const posted=entries.filter(e=>e?.state==='POSTED')
  const byCustomer={}
  for(const e of posted){
    if(!byCustomer[e.customerId]) byCustomer[e.customerId]={customerId:e.customerId,grossBtc:0,feesBtc:0,netBtc:0,credits:0}
    const row=byCustomer[e.customerId]
    row.grossBtc+=n(e.grossBtc);row.feesBtc+=n(e.poolFeeBtc)+n(e.serviceFeeBtc)+n(e.electricityFeeBtc);row.netBtc+=n(e.netBtc);row.credits+=1
  }
  return {postedCredits:posted.length,grossBtc:posted.reduce((s,e)=>s+n(e.grossBtc),0),feesBtc:posted.reduce((s,e)=>s+n(e.poolFeeBtc)+n(e.serviceFeeBtc)+n(e.electricityFeeBtc),0),netBtc:posted.reduce((s,e)=>s+n(e.netBtc),0),customers:Object.values(byCustomer),generatedAt:now()}
}

export function assertNoDuplicateCredit(entries=[],attribution){
  if(entries.some(e=>e.sourceAttributionId===attribution.attributionId)) throw new Error('ATTRIBUTION_ALREADY_CREDITED')
  return true
}
