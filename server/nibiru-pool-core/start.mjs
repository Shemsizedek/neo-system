import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {createWorldMintDaemon} from './daemon.mjs'
import {NibiruPoolStore} from './persistence.mjs'
import {credentialResolverFromStore} from './workerOnboarding.mjs'
import {createHealthServer} from './healthServer.mjs'
import {loadWorldMintConfig,redactedConfig} from './opsConfig.mjs'

const config=loadWorldMintConfig()
const rpc=bitcoinRpcClient({url:config.rpcUrl,auth:config.rpcAuth})
const credentialStore=new NibiruPoolStore(config.dbPath)
const credentialResolver=credentialResolverFromStore(credentialStore,config.poolId)
const daemon=createWorldMintDaemon({
  rpc,
  payoutScriptHex:config.payoutScriptHex,
  credentialResolver,
  dbPath:config.dbPath,
  poolId:config.poolId,
  host:config.stratumHost,
  port:config.stratumPort,
  templateIntervalMs:config.templateRefreshMs,
  confirmationIntervalMs:config.confirmationCheckMs
})

let started=false
const statusProvider=async()=>{
  const job=daemon.currentJob()
  let chain=null
  let rpcHealthy=false
  try{
    chain=await rpc('getblockchaininfo',[])
    rpcHealthy=true
  }catch{}
  return {
    service:'world-mint-genesis-pool',
    poolId:config.poolId,
    running:started,
    ready:Boolean(started&&rpcHealthy&&job),
    bitcoinRpcHealthy:rpcHealthy,
    chain:chain?{chain:chain.chain,blocks:chain.blocks,headers:chain.headers,initialblockdownload:Boolean(chain.initialblockdownload),bestblockhash:chain.bestblockhash}:null,
    stratum:{host:config.stratumHost,port:config.stratumPort},
    job:job?{jobId:job.runtimeJobId,templateId:job.template.templateId,height:job.template.height,issuedAt:job.createdAt}:null,
    difficulty:String(daemon.currentDifficulty())
  }
}

const health=createHealthServer({host:config.healthHost,port:config.healthPort,statusProvider})

async function shutdown(signal){
  process.stdout.write(`[world-mint] ${signal} received; stopping\n`)
  started=false
  await Promise.allSettled([health.stop(),daemon.stop()])
  credentialStore.close()
}

process.on('SIGINT',()=>void shutdown('SIGINT').finally(()=>process.exit(0)))
process.on('SIGTERM',()=>void shutdown('SIGTERM').finally(()=>process.exit(0)))

try{
  await daemon.start()
  started=true
  await health.start()
  process.stdout.write(`[world-mint] started ${JSON.stringify(redactedConfig(config))}\n`)
}catch(error){
  started=false
  credentialStore.close()
  process.stderr.write(`[world-mint] startup failed: ${String(error?.message||error)}\n`)
  process.exitCode=1
}
