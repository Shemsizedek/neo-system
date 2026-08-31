import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'
import {assessBitcoinCoreReadiness} from './liveReadiness.mjs'

function requireRegtest(chain){
  if(chain!=='regtest')throw new Error(`REGTEST_REQUIRED:${chain||'unknown'}`)
}

export async function runRegtestGate({rpc,generateBlocks=1}={}){
  if(typeof rpc!=='function')throw new Error('BITCOIN_RPC_CLIENT_REQUIRED')
  const before=await rpc('getblockchaininfo',[])
  requireRegtest(before?.chain)
  const network=await rpc('getnetworkinfo',[])
  const template=await rpc('getblocktemplate',[{rules:['segwit']}])
  const readiness=assessBitcoinCoreReadiness({network,chain:before,template})
  if(!readiness.ready){
    const failed=readiness.checks.filter(check=>!check.ok).map(check=>check.id)
    throw new Error(`REGTEST_NOT_READY:${failed.join(',')}`)
  }
  const result={
    ok:true,
    chain:'regtest',
    blocksBefore:Number(before.blocks),
    templateHeight:Number(template.height),
    networkActive:network.networkactive===true,
    generated:[]
  }
  if(Number(generateBlocks)>0){
    const count=Number(generateBlocks)
    if(!Number.isSafeInteger(count)||count<0)throw new Error('INVALID_GENERATE_BLOCKS')
    const address=await rpc('getnewaddress',['neo-world-mint-regtest','bech32'])
    result.generated=await rpc('generatetoaddress',[count,address])
    const after=await rpc('getblockchaininfo',[])
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
