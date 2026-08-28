import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const n=v=>Number(v||0)

export function createEnrollmentChallenge({minerId,publicKey}){
  if(!minerId||!publicKey) throw new Error('MINER_ID_AND_PUBLIC_KEY_REQUIRED')
  return {challengeId:`CH-${crypto.randomUUID()}`,minerId,publicKey,nonce:crypto.randomBytes(24).toString('hex'),issuedAt:now(),expiresAt:new Date(Date.now()+5*60_000).toISOString(),state:'PENDING'}
}

export function verifyEnrollmentChallenge(challenge,{signature,verifySignature}){
  if(!challenge||challenge.state!=='PENDING') throw new Error('INVALID_CHALLENGE')
  if(Date.now()>Date.parse(challenge.expiresAt)) throw new Error('CHALLENGE_EXPIRED')
  if(!signature||typeof verifySignature!=='function') throw new Error('SIGNATURE_REQUIRED')
  const ok=verifySignature({publicKey:challenge.publicKey,message:challenge.nonce,signature})===true
  if(!ok) throw new Error('MINER_IDENTITY_VERIFICATION_FAILED')
  return {...challenge,state:'VERIFIED',verifiedAt:now()}
}

export function enrollMiner({challenge,model,serial,firmware,siteId}){
  if(challenge?.state!=='VERIFIED') throw new Error('VERIFIED_CHALLENGE_REQUIRED')
  return {id:challenge.minerId,identityKey:challenge.publicKey,model:model||'UNKNOWN',serial:serial||null,firmware:firmware||null,siteId:siteId||null,state:'ENROLLED',trust:'VERIFIED_IDENTITY',lastSeenAt:null,telemetry:null,shareStats:{accepted:0,rejected:0,verified:0},createdAt:now()}
}

export function registerTelemetry(miner,input={}){
  if(miner?.state!=='ENROLLED'&&miner?.state!=='ONLINE') throw new Error('MINER_NOT_ENROLLED')
  const telemetry={hashrateTh:n(input.hashrateTh),powerW:n(input.powerW),temperatureC:n(input.temperatureC),fanRpm:n(input.fanRpm),uptimeSec:n(input.uptimeSec),poolConnected:input.poolConnected===true,reportedAt:input.reportedAt||now()}
  if(telemetry.hashrateTh<0||telemetry.powerW<0||telemetry.temperatureC<0) throw new Error('INVALID_TELEMETRY')
  return {...miner,state:'ONLINE',lastSeenAt:telemetry.reportedAt,telemetry}
}

export function verifyStratumShare({miner,share,poolReceipt}){
  if(miner?.trust!=='VERIFIED_IDENTITY') throw new Error('UNVERIFIED_MINER')
  if(miner?.state!=='ONLINE') throw new Error('MINER_OFFLINE')
  if(!share?.shareId||share.minerId!==miner.id) throw new Error('SHARE_MINER_MISMATCH')
  if(!share.contractId||!share.allocationId) throw new Error('SHARE_CONTRACT_PROVENANCE_REQUIRED')
  if(share.simulation===true) throw new Error('SIMULATION_SHARE_BLOCKED')
  if(!poolReceipt?.accepted||poolReceipt.shareId!==share.shareId) throw new Error('POOL_ACCEPTANCE_NOT_VERIFIED')
  if(!poolReceipt.poolId||!poolReceipt.receivedAt) throw new Error('POOL_RECEIPT_INCOMPLETE')
  return {shareId:share.shareId,minerId:miner.id,contractId:share.contractId,allocationId:share.allocationId,poolId:poolReceipt.poolId,difficulty:n(share.difficulty),accepted:true,verified:true,jobId:share.jobId||null,receivedAt:poolReceipt.receivedAt,verifiedAt:now(),accountingEligible:true}
}

export function applyShareResult(miner,result){
  const stats={...miner.shareStats}
  if(result?.accepted) stats.accepted+=1; else stats.rejected+=1
  if(result?.verified) stats.verified+=1
  return {...miner,shareStats:stats}
}

export function accountingEligibleShare(result){
  return result?.accepted===true&&result?.verified===true&&result?.accountingEligible===true
}

export function fleetSnapshot(miners=[]){
  const online=miners.filter(m=>m.state==='ONLINE')
  return {enrolled:miners.length,online:online.length,verifiedIdentities:miners.filter(m=>m.trust==='VERIFIED_IDENTITY').length,totalHashrateTh:online.reduce((s,m)=>s+n(m.telemetry?.hashrateTh),0),acceptedShares:miners.reduce((s,m)=>s+n(m.shareStats?.accepted),0),verifiedShares:miners.reduce((s,m)=>s+n(m.shareStats?.verified),0),generatedAt:now()}
}
