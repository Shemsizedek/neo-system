import {loadWorldMintConfig,redactedConfig} from './opsConfig.mjs'
import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'

const now=()=>new Date().toISOString()

export function assessBitcoinCoreReadiness({network,chain,template}={}){
  const checks=[]
  const add=(id,ok,detail)=>checks.push({id,ok:Boolean(ok),detail})
  add('RPC_VERSION',Number(network?.version||0)>0,network?.subversion||null)
  add('NETWORK_ACTIVE',network?.networkactive===true,network?.networkactive??null)
  add('CHAIN_KNOWN',typeof chain?.chain==='string'&&chain.chain.length>0,chain?.chain||null)
  add('INITIAL_BLOCK_DOWNLOAD_COMPLETE',chain?.initialblockdownload===false,chain?.initialblockdownload??null)
  const blocks=Number(chain?.blocks||0),headers=Number(chain?.headers||0)
  add('CHAIN_SYNC_GAP',blocks>0&&headers>=blocks&&headers-blocks<=2,{blocks,headers,gap:headers-blocks})
  add('BEST_BLOCK_HASH',/^[0-9a-f]{64}$/i.test(chain?.bestblockhash||''),chain?.bestblockhash||null)
  add('GBT_HEIGHT',Number(template?.height||0)>0,template?.height||null)
  add('GBT_PREVIOUS_BLOCK',/^[0-9a-f]{64}$/i.test(template?.previousblockhash||''),template?.previousblockhash||null)
  add('GBT_TARGET',/^[0-9a-f]{64}$/i.test(template?.target||''),template?.target||null)
  add('GBT_COINBASE_VALUE',Number(template?.coinbasevalue||0)>0,template?.coinbasevalue||null)
  const ready=checks.every(check=>check.ok)
  return Object.freeze({ready,checkedAt:now(),checks})
}

export async function runLiveReadiness({env=process.env,rpc:providedRpc}={}){
  const config=loadWorldMintConfig(env)
  const rpc=providedRpc||bitcoinRpcClient({url:config.rpcUrl,auth:config.rpcAuth})
  const [network,chain,template]=await Promise.all([
    rpc('getnetworkinfo',[]),
    rpc('getblockchaininfo',[]),
    rpc('getblocktemplate',[{rules:['segwit']}])
  ])
  const assessment=assessBitcoinCoreReadiness({network,chain,template})
  return Object.freeze({
    service:'world-mint-genesis-pool',
    poolId:config.poolId,
    configuration:redactedConfig(config),
    bitcoin:{chain:chain.chain,blocks:chain.blocks,headers:chain.headers,bestblockhash:chain.bestblockhash,subversion:network.subversion},
    template:{height:template.height,previousblockhash:template.previousblockhash,bits:template.bits,transactionCount:Array.isArray(template.transactions)?template.transactions.length:0},
    ...assessment
  })
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const report=await runLiveReadiness()
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`)
    if(!report.ready)process.exitCode=2
  }catch(error){
    process.stderr.write(`[world-mint-preflight] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
