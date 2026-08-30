import crypto from 'node:crypto'

export const POOL_STATES=Object.freeze({DRAFT:'DRAFT',READY:'READY',ACTIVE:'ACTIVE',PAUSED:'PAUSED',CLOSED:'CLOSED'})
export const POOL_ROLES=Object.freeze({MEMBER:'MEMBER',OPERATOR:'OPERATOR',AUDITOR:'AUDITOR'})

const id=(prefix)=>`${prefix}_${crypto.randomUUID()}`
const iso=()=>new Date().toISOString()

export function createNibiruPool({name,operatorMemberId,payoutAddress,policyRef='NEO-SOCIETY-RESOLUTION-002',metadata={}}={}){
  if(!name||!operatorMemberId) throw new Error('POOL_IDENTITY_REQUIRED')
  if(!payoutAddress) throw new Error('POOL_PAYOUT_ADDRESS_REQUIRED')
  return Object.freeze({
    poolId:id('npool'),name,operatorMemberId,payoutAddress,policyRef,metadata,
    state:POOL_STATES.DRAFT,createdAt:iso(),activatedAt:null,
    accounting:{acceptedShares:'0',rejectedShares:'0',creditedSats:'0',paidSats:'0'},
    workers:[]
  })
}

export function registerWorker(pool,{workerId=id('worker'),memberId,label,declaredHashrateTHs=null}={}){
  if(!pool?.poolId) throw new Error('POOL_REQUIRED')
  if(!memberId) throw new Error('MEMBER_REQUIRED')
  if(pool.state===POOL_STATES.CLOSED) throw new Error('POOL_CLOSED')
  if(pool.workers.some(w=>w.workerId===workerId)) throw new Error('WORKER_EXISTS')
  const worker=Object.freeze({workerId,memberId,label:label||workerId,declaredHashrateTHs,registeredAt:iso(),state:'REGISTERED'})
  return Object.freeze({...pool,workers:Object.freeze([...pool.workers,worker])})
}

export function markPoolReady(pool,{bitcoinRpcConfigured=false,stratumConfigured=false}={}){
  if(!bitcoinRpcConfigured) throw new Error('BITCOIN_RPC_REQUIRED')
  if(!stratumConfigured) throw new Error('STRATUM_REQUIRED')
  if(!pool.workers.length) throw new Error('WORKER_REQUIRED')
  return Object.freeze({...pool,state:POOL_STATES.READY})
}

export function activatePool(pool){
  if(pool.state!==POOL_STATES.READY) throw new Error('POOL_NOT_READY')
  return Object.freeze({...pool,state:POOL_STATES.ACTIVE,activatedAt:iso()})
}

export function recordShare(pool,{workerId,difficulty,accepted,jobId,hash=null}={}){
  if(pool.state!==POOL_STATES.ACTIVE) throw new Error('POOL_NOT_ACTIVE')
  if(!pool.workers.some(w=>w.workerId===workerId)) throw new Error('UNKNOWN_WORKER')
  if(!(Number(difficulty)>0)) throw new Error('INVALID_DIFFICULTY')
  const acceptedShares=BigInt(pool.accounting.acceptedShares)+(accepted?1n:0n)
  const rejectedShares=BigInt(pool.accounting.rejectedShares)+(accepted?0n:1n)
  return {
    pool:Object.freeze({...pool,accounting:Object.freeze({...pool.accounting,acceptedShares:String(acceptedShares),rejectedShares:String(rejectedShares)})}),
    share:Object.freeze({shareId:id('share'),poolId:pool.poolId,workerId,jobId,difficulty:String(difficulty),accepted:Boolean(accepted),hash,recordedAt:iso()})
  }
}

export function buildPoolAuditSnapshot(pool){
  return Object.freeze({schema:'neo.nibiru.pool.audit.v1',generatedAt:iso(),poolId:pool.poolId,state:pool.state,policyRef:pool.policyRef,workerCount:pool.workers.length,accounting:pool.accounting})
}
