import crypto from 'node:crypto'

const now=()=>new Date().toISOString()

export function toProductionEvent({pool,job,share}={}){
  if(!pool?.poolId) throw new Error('POOL_REQUIRED')
  if(!job?.jobId) throw new Error('JOB_REQUIRED')
  if(!share?.submissionId||share.verified!==true) throw new Error('VERIFIED_SHARE_REQUIRED')
  if(share.jobId!==job.jobId) throw new Error('JOB_MISMATCH')
  return Object.freeze({
    eventId:`prod_${crypto.randomUUID()}`,
    schema:'neo.miner.production.share.v1',
    sourceType:'NIBIRU_POOL',
    poolId:pool.poolId,
    workerId:share.workerId,
    jobId:job.jobId,
    templateId:job.templateId,
    height:job.height,
    difficulty:share.difficulty,
    accepted:share.accepted===true,
    blockCandidate:share.blockCandidate===true,
    computedHash:share.computedHash||null,
    creditedSats:'0',
    btcProductionFinal:false,
    recordedAt:now()
  })
}

export function confirmBlockProduction(event,{blockHash,confirmations=0,coinbaseValueSats}={}){
  if(!event?.eventId||event.blockCandidate!==true) throw new Error('BLOCK_CANDIDATE_REQUIRED')
  if(!/^[0-9a-f]{64}$/i.test(blockHash||'')) throw new Error('BLOCK_HASH_REQUIRED')
  if(!/^\d+$/.test(String(coinbaseValueSats??''))) throw new Error('COINBASE_VALUE_REQUIRED')
  const conf=Math.max(0,Number(confirmations||0))
  return Object.freeze({...event,blockHash,confirmations:conf,creditedSats:String(coinbaseValueSats),btcProductionFinal:conf>0,confirmedAt:now()})
}

export function generatorAttribution(event){
  if(!event?.eventId) throw new Error('PRODUCTION_EVENT_REQUIRED')
  return Object.freeze({
    attributionId:`attr_${crypto.randomUUID()}`,
    source:'NIBIRU_POOL',
    poolId:event.poolId,
    workerId:event.workerId,
    height:event.height,
    acceptedShare:event.accepted,
    blockCandidate:event.blockCandidate,
    confirmedBitcoinProduction:event.btcProductionFinal===true,
    sats:event.btcProductionFinal===true?event.creditedSats:'0',
    createdAt:now()
  })
}
