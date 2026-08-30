import {PersistentStateStore} from '../miner-production/persistentStore.mjs'

export class NibiruPoolStore{
  constructor(path=process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite'){
    this.store=new PersistentStateStore(path)
  }
  savePool(pool){return this.store.put('nibiru_pool',pool.poolId,pool,{action:'NIBIRU_POOL_UPSERT'})}
  saveCredential(credential){return this.store.put('nibiru_worker_credential',credential.credentialId,credential,{action:'NIBIRU_WORKER_CREDENTIAL_UPSERT'})}
  saveJob(job){return this.store.put('nibiru_mining_job',job.jobId,job,{action:'NIBIRU_MINING_JOB_ISSUED'})}
  saveShare(share){
    const key=share.submissionId||share.shareId
    if(!key) throw new Error('SHARE_ID_REQUIRED')
    return this.store.idempotentPut({scope:'nibiru-share',key,kind:'nibiru_share',id:key,value:share,action:share.accepted?'NIBIRU_SHARE_ACCEPTED':'NIBIRU_SHARE_RECORDED'})
  }
  saveBlockCandidate(candidate){
    if(!candidate?.submissionId) throw new Error('BLOCK_CANDIDATE_REQUIRED')
    return this.store.put('nibiru_block_candidate',candidate.submissionId,candidate,{action:'NIBIRU_BLOCK_CANDIDATE'})
  }
  audit(limit){return this.store.audit(limit)}
  close(){this.store.close()}
}
