import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {runLiveReadiness} from './liveReadiness.mjs'

function requireRegtest(chain){
  if(chain!=='regtest')throw new Error(`REGTEST_REQUIRED:${chain||'unknown'}`)
}

export async function runRegtestGate({rpc,generateBlocks=1}={}){
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const before=await rpc('getblockchaininfo')
  requireRegtest(before?.chain)
  const network=await rpc('getnetworkinfo')
  const template=await rpc('getblocktemplate',[{rules:['segwit']}])
  const readiness=await runLiveReadiness({rpc})
  if(!readiness.ready)throw new Error(`REGTEST_NOT_READY:${readiness.reasons.join(',')}`)
  const result={
    ok:true,
    chain:'regtest',
    blocksBefore:Number(before.blocks),
    templateHeight:Number(template.height),
    networkActive:network.networkactive!==false,
    generated:[]
  }
  if(Number(generateBlocks)>0){
    const address=await rpc('getnewaddress',['neo-world-mint-regtest','bech32'])
    result.generated=await rpc('generatetoaddress',[Number(generateBlocks),address])
    const after=await rpc('getblockchaininfo')
    result.blocksAfter=Number(after.blocks)
    result.bestBlockHash=after.bestblockhash
  }
  return Object.freeze(result)
}

function arg(name){
  const prefix=`--${name}=`
  return process.argv.find(value=>value.startsWith(prefix))?.slice(prefix.length)||null
}

if(import.meta.url===`file://${process.argv[1]}`){
  try{
    const url=process.env.BITCOIN_RPC_URL
    const auth=process.env.BITCOIN_RPC_AUTH
    if(!url||!auth)throw new Error('BITCOIN_RPC_URL_AND_AUTH_REQUIRED')
    const rpc=bitcoinRpcClient({url,auth})
    const generateBlocks=Number(arg('generate')||0)
    const result=await runRegtestGate({rpc,generateBlocks})
    process.stdout.write(`${JSON.stringify(result,null,2)}\n`)
  }catch(error){
    process.stderr.write(`[regtest-gate] ${String(error?.message||error)}\n`)
    process.exitCode=1
  }
}
