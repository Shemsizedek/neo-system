import {createHash} from 'node:crypto'
import {PersistentStateStore} from '../miner-production/persistentStore.mjs'

function requiredShareField(share,name){
  const value=share?.[name]
  if(value===undefined||value===null||String(value).length===0) throw new Error(`SHARE_${name.toUpperCase()}_REQUIRED`)
  return String(value)
}

export function shareFingerprint(share){
  const canonical=[
    requiredShareField(share,'poolId'),
    requiredShareField(share,'jobId'),
    requiredShareField(share,'workerId'),
    requiredShareField(share,'extranonce2'),
    requiredShareField(share,'ntime'),
    requiredShareField(share,'nonce')
  ].join('|')
  return createHash('sha256').update(canonical,'utf8').digest('hex')
}

export class NibiruPoolStore{
  constructor(path=process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite'){
    this.store=new PersistentStateStore(path)
  }
  savePool(pool){return this.store.put('nibiru_pool',pool.poolId,pool,{action:'NIBIRU_POOL_UPSERT'})}
  saveCredential(credential){return this.store.put('nibiru_worker_credential',credential.credentialId,credential,{action:'NIBIRU_WORKER_CREDENTIAL_UPSERT'})}
  saveJob(job){return this.store.put('nibiru_mining_job',job.jobId,job,{action:'NIBIRU_MINING_JOB_ISSUED'})}
  saveShare(share){
    const fingerprint=shareFingerprint(share)
    const value={...share,shareFingerprint:fingerprint}
    return this.store.idempotentPut({scope:'nibiru-share',key:fingerprint,kind:'nibiru_share',id:fingerprint,value,action:share.accepted?'NIBIRU_SHARE_ACCEPTED':'NIBIRU_SHARE_RECORDED'})
  }
  saveBlockCandidate(candidate){
    if(!candidate?.submissionId) throw new Error('BLOCK_CANDIDATE_REQUIRED')
    return this.store.put('nibiru_block_candidate',candidate.submissionId,candidate,{action:'NIBIRU_BLOCK_CANDIDATE'})
  }
  audit(limit){return this.store.audit(limit)}
  close(){this.store.close()}
}
