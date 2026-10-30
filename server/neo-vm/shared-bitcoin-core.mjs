import {bitcoinRpcClient} from '../miner-production/bitcoinWallet.mjs'

const READ_ONLY_METHODS=new Set([
  'getblockchaininfo',
  'getnetworkinfo',
  'gettxout',
  'decoderawtransaction',
  'testmempoolaccept'
])

/**
 * Reuse the operator's existing Bitcoin Core RPC transport.
 * This is NOT an adapter to Counterparty API v2: it requires Bitcoin Core RPC.
 * Restricts the callable methods before the request reaches the shared client.
 */
export function restrictedBvmBitcoinRpc(rpc){
  if(typeof rpc!=='function')throw new Error('BVM_BITCOIN_RPC_REQUIRED')
  return async(method,params=[])=>{
    if(typeof method!=='string'||!READ_ONLY_METHODS.has(method))throw new Error('BVM_RPC_METHOD_FORBIDDEN')
    if(!Array.isArray(params))throw new Error('BVM_RPC_PARAMS_INVALID')
    return rpc(method,params)
  }
}

export function createRestrictedBvmBitcoinRpc({url,auth,fetchImpl}={}){
  const endpoint=new URL(url)
  if(endpoint.protocol!=='http:'||
     !['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname)||
     endpoint.username||endpoint.password||
     endpoint.pathname!=='/'||endpoint.search||endpoint.hash){
    throw new Error('BVM_LOOPBACK_RPC_REQUIRED')
  }
  if(typeof auth!=='string'||!auth.trim())throw new Error('BVM_RPC_AUTH_REQUIRED')
  return restrictedBvmBitcoinRpc(bitcoinRpcClient({url,auth,fetchImpl}))
}

/**
 * Operator-only, read-only introspection to identify the Bitcoin Core instance.
 * The regular Counterparty mainnet node is not an execution target for
 * regtest-only BVM. Same binary installation is fine; separate datadir and
 * RPC port are required for regtest and mainnet.
 */
export async function inspectBvmBitcoinCore(rpc){
  const restricted=restrictedBvmBitcoinRpc(rpc)
  const chain=await restricted('getblockchaininfo',[])
  const network=await restricted('getnetworkinfo',[])
  const name=chain?.chain
  const version=network?.version
  return Object.freeze({
    node:'Bitcoin Core',
    chain:typeof name==='string'?name:'unknown',
    version:Number.isSafeInteger(version)?version:null,
    blocks:Number.isSafeInteger(chain?.blocks)?chain.blocks:null,
    headers:Number.isSafeInteger(chain?.headers)?chain.headers:null,
    initialBlockDownload:chain?.initialblockdownload===true,
    compatibleWithBvmRegtest:name==='regtest',
    credentialsExposed:false,
    signingEnabled:false,
    broadcastingEnabled:false
  })
}
