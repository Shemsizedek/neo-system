import {NibiruPoolStore} from './persistence.mjs'
import {createGenesisPoolRuntime} from './genesisRuntime.mjs'
import {createStratumGateway} from './gatewayCore.mjs'

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const now=()=>new Date().toISOString()

export function createWorldMintDaemon({
  rpc,
  payoutScriptHex,
  credentialResolver,
  dbPath=process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite',
  poolId='world-mint-genesis',
  host=process.env.NIBIRU_STRATUM_HOST||'0.0.0.0',
  port=Number(process.env.NIBIRU_STRATUM_PORT||3333),
  templateIntervalMs=Number(process.env.NIBIRU_TEMPLATE_REFRESH_MS||15000),
  confirmationIntervalMs=Number(process.env.NIBIRU_CONFIRMATION_CHECK_MS||30000)
}={}){
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  if(!payoutScriptHex)throw new Error('PAYOUT_SCRIPT_REQUIRED')
  if(typeof credentialResolver!=='function')throw new Error('CREDENTIAL_RESOLVER_REQUIRED')

  const store=new NibiruPoolStore(dbPath)
  const runtime=createGenesisPoolRuntime({rpc,payoutScriptHex,poolId})
  const jobs=new Map()
  const candidates=new Map()
  let running=false
  let gateway=null
  let currentTip=null

  function persistCurrentJob(){
    const current=runtime.currentJob()
    if(!current)return null
    const job={
      jobId:current.runtimeJobId,
      poolId,
      templateId:current.template.templateId,
      height:current.template.height,
      previousBlockHash:current.template.previousBlockHash,
      bits:current.template.bits,
      version:current.template.version,
      difficulty:runtime.currentDifficulty(),
      extranonce1:current.extranonce1,
      extranonce2Size:current.extranonce2Size,
      issuedAt:current.createdAt,
      stale:false
    }
    jobs.set(job.jobId,job)
    store.saveJob(job)
    return job
  }

  async function refreshTemplate(){
    const previous=runtime.currentJob()
    await runtime.refreshTemplate()
    if(previous){
      const old=jobs.get(previous.runtimeJobId)
      if(old){
        const stale={...old,stale:true,staleAt:now()}
        jobs.set(stale.jobId,stale)
        store.saveJob(stale)
      }
    }
    return persistCurrentJob()
  }

  async function blockCandidateHandler({submission}){
    const current=runtime.currentJob()
    if(!current||submission.jobId!==current.runtimeJobId)throw new Error('STALE_JOB')
    const solution=runtime.verifyWorkerSolution({extranonce2:submission.extranonce2,ntime:submission.ntime,nonce:submission.nonce})
    if(!solution.submission.blockCandidate)throw new Error('NETWORK_TARGET_NOT_MET')
    const result=await runtime.submitIfBlockCandidate(solution)
    const candidate={...result,submissionId:submission.submissionId,jobId:submission.jobId,hash:solution.submission.hash,height:current.template.height,coinbaseValueSats:current.template.coinbaseValueSats,state:result.accepted?'SUBMITTED':'REJECTED',updatedAt:now(),bookableBtc:false}
    candidates.set(candidate.submissionId,candidate)
    store.saveBlockCandidate(candidate)
    return candidate
  }

  async function checkCandidate(candidate){
    if(candidate.state!=='SUBMITTED')return candidate
    try{
      const header=await rpc('getblockheader',[candidate.hash,true])
      if(!header||Number(header.confirmations||0)<1)return candidate
      const confirmed={...candidate,state:'CONFIRMED',confirmations:Number(header.confirmations),blockHash:candidate.hash,confirmedAt:now(),bookableBtc:true}
      candidates.set(confirmed.submissionId,confirmed)
      store.saveBlockCandidate(confirmed)
      store.store.put('nibiru_production',confirmed.blockHash,{
        productionId:`prod_${confirmed.blockHash}`,
        poolId,
        blockHash:confirmed.blockHash,
        height:confirmed.height,
        rewardSats:confirmed.coinbaseValueSats,
        source:'WORLD_MINT_GENESIS_POOL',
        state:'CONFIRMED',
        bookableBtc:true,
        confirmedAt:confirmed.confirmedAt
      },{action:'NIBIRU_BTC_PRODUCTION_CONFIRMED'})
      return confirmed
    }catch{return candidate}
  }

  async function templateLoop(){
    while(running){
      try{
        const info=await rpc('getblockchaininfo',[])
        const tip=`${info.blocks}:${info.bestblockhash}`
        if(tip!==currentTip||!runtime.currentJob()){
          await refreshTemplate()
          currentTip=tip
          gateway?.broadcastDifficulty?.(runtime.difficultyUpdate())
          gateway?.broadcastNotify?.(runtime.notifyMessage())
        }
      }catch(error){store.store.appendAudit('nibiru_daemon',poolId,'TEMPLATE_LOOP_ERROR',{error:String(error?.message||error)})}
      await sleep(templateIntervalMs)
    }
  }

  async function confirmationLoop(){
    while(running){
      for(const candidate of candidates.values())await checkCandidate(candidate)
      await sleep(confirmationIntervalMs)
    }
  }

  async function start(){
    if(running)return {poolId,host,port,state:'RUNNING'}
    running=true
    await refreshTemplate()
    gateway=createStratumGateway({
      host,port,poolId,
      credentialResolver,
      jobResolver:async jobId=>{const job=jobs.get(jobId);return job&&!job.stale?job:null},
      shareRecorder:async share=>store.saveShare(share),
      blockCandidateHandler,
      notifyResolver:()=>runtime.notifyMessage(),
      difficultyResolver:()=>runtime.difficultyUpdate()
    })
    await gateway.start()
    gateway.broadcastDifficulty?.(runtime.difficultyUpdate())
    gateway.broadcastNotify?.(runtime.notifyMessage())
    void templateLoop()
    void confirmationLoop()
    store.store.appendAudit('nibiru_daemon',poolId,'WORLD_MINT_DAEMON_STARTED',{host,port})
    return {poolId,host,port,state:'RUNNING'}
  }

  async function stop(){
    if(!running)return
    running=false
    if(gateway)await gateway.stop()
    store.store.appendAudit('nibiru_daemon',poolId,'WORLD_MINT_DAEMON_STOPPED',{})
    store.close()
  }

  return Object.freeze({start,stop,refreshTemplate,currentJob:()=>runtime.currentJob(),currentDifficulty:()=>runtime.currentDifficulty()})
}
