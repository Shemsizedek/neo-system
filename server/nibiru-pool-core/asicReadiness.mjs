import {loadWorldMintConfig,redactedConfig} from './opsConfig.mjs'
import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'

const now=()=>new Date().toISOString()
const bool=v=>String(v||'').toLowerCase()==='true'

export function assessAsicReadiness({config,network,chain,template,env=process.env}={}){
  const checks=[]
  const add=(id,ok,detail)=>checks.push(Object.freeze({id,ok:Boolean(ok),detail}))
  add('BITCOIN_MAINNET',chain?.chain==='main',chain?.chain||null)
  add('NETWORK_ACTIVE',network?.networkactive===true,network?.networkactive??null)
  add('INITIAL_BLOCK_DOWNLOAD_COMPLETE',chain?.initialblockdownload===false,chain?.initialblockdownload??null)
  const blocks=Number(chain?.blocks||0),headers=Number(chain?.headers||0)
  add('CHAIN_SYNCED',blocks>0&&headers>=blocks&&headers-blocks<=2,{blocks,headers,gap:headers-blocks})
  add('BEST_BLOCK_HASH',/^[0-9a-f]{64}$/i.test(chain?.bestblockhash||''),chain?.bestblockhash||null)
  add('GBT_VALID',Number(template?.height||0)>0&&/^[0-9a-f]{64}$/i.test(template?.previousblockhash||'')&&/^[0-9a-f]{8}$/i.test(template?.bits||''),{height:template?.height||null,bits:template?.bits||null})
  add('PAYOUT_SCRIPT_VALID',/^[0-9a-f]+$/i.test(config?.payoutScriptHex||'')&&config.payoutScriptHex.length%2===0,config?.payoutScriptHex?`${config.payoutScriptHex.slice(0,12)}…`:null)
  const loopback=['127.0.0.1','localhost','::1'].includes(config?.stratumHost)
  const exposureApproved=loopback||bool(env.NIBIRU_ALLOW_EXTERNAL_STRATUM)
  add('STRATUM_EXPOSURE_APPROVED',exposureApproved,{host:config?.stratumHost||null,loopback,explicitExternalApproval:bool(env.NIBIRU_ALLOW_EXTERNAL_STRATUM)})
  add('ASIC_WORKER_ENROLLED',Boolean(String(env.NIBIRU_ASIC_WORKER_ID||'').trim()),String(env.NIBIRU_ASIC_WORKER_ID||'').trim()||null)
  add('MAINNET_ACTIVATION_ACK',bool(env.NIBIRU_MAINNET_MINING_ACK),bool(env.NIBIRU_MAINNET_MINING_ACK))
  return Object.freeze({ready:checks.every(c=>c.ok),checkedAt:now(),checks})
}

export async function runAsicReadiness({env=process.env,rpc:providedRpc}={}){
  const config=loadWorldMintConfig(env)
  const rpc=providedRpc||bitcoinRpcClient({url:config.rpcUrl,auth:config.rpcAuth})
  const [network,chain,template]=await Promise.all([
    rpc('getnetworkinfo',[]),
    rpc('getblockchaininfo',[]),
    rpc('getblocktemplate',[{rules:['segwit']}])
  ])
  const assessment=assessAsicReadiness({config,network,chain,template,env})
  return Object.freeze({
    service:'world-mint-genesis-pool',
    mode:'ASIC_READINESS_ONLY',
    configuration:redactedConfig(config),
    bitcoin:{chain:chain.chain,blocks:chain.blocks,headers:chain.headers,bestblockhash:chain.bestblockhash,subversion:network.subversion},
    template:{height:template.height,previousblockhash:template.previousblockhash,bits:template.bits},
    ...assessment
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const report=await runAsicReadiness()
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`)
    if(!report.ready)process.exitCode=2
  }catch(error){
    process.stderr.write(`[asic-readiness] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
