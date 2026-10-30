import test from 'node:test'
import assert from 'node:assert/strict'
import {createRestrictedBvmBitcoinRpc,restrictedBvmBitcoinRpc,inspectBvmBitcoinCore} from './shared-bitcoin-core.mjs'

test('shared Core transport permits only five read-only RPC methods',async()=>{
  const calls=[]
  const rpc=restrictedBvmBitcoinRpc(async(method,params)=>{
    calls.push([method,params])
    return {ok:true}
  })
  for(const method of ['getblockchaininfo','getnetworkinfo','gettxout','decoderawtransaction','testmempoolaccept']){
    assert.deepEqual(await rpc(method,[]),{ok:true})
  }
  assert.equal(calls.length,5)
  for(const method of ['sendrawtransaction','submitblock','signrawtransactionwithwallet',
    'walletpassphrase','getnewaddress','getwalletinfo','stop','generatetoaddress']){
    await assert.rejects(()=>rpc(method,[]),/BVM_RPC_METHOD_FORBIDDEN/)
  }
  assert.equal(calls.length,5)
  await assert.rejects(()=>rpc('getblockchaininfo',{}),/BVM_RPC_PARAMS_INVALID/)
})

test('shared Core preflight reports a mainnet Counterparty node as incompatible',async()=>{
  const methods=[]
  const result=await inspectBvmBitcoinCore(async(method)=>{
    methods.push(method)
    if(method==='getblockchaininfo')return {chain:'main',blocks:900000,headers:900000,initialblockdownload:false}
    if(method==='getnetworkinfo')return {version:280000}
    throw new Error('unexpected')
  })
  assert.equal(result.chain,'main')
  assert.equal(result.compatibleWithBvmRegtest,false)
  assert.equal(result.signingEnabled,false)
  assert.deepEqual(methods,['getblockchaininfo','getnetworkinfo'])
})

test('separate regtest Bitcoin Core instance is recognized without secrets',async()=>{
  const status=await inspectBvmBitcoinCore(async(method)=>{
    if(method==='getblockchaininfo')return {chain:'regtest',blocks:101,headers:101}
    if(method==='getnetworkinfo')return {version:280000}
  })
  assert.equal(status.compatibleWithBvmRegtest,true)
  assert.equal(status.credentialsExposed,false)
})

test('Core RPC endpoint is restricted to literal loopback with external credentials',()=>{
  const fetchImpl=async()=>({ok:true,json:async()=>({result:{chain:'regtest'}})})
  const good=createRestrictedBvmBitcoinRpc({url:'http://127.0.0.1:18443/',auth:'user:password',fetchImpl})
  assert.equal(typeof good,'function')
  for(const url of [
    'http://10.0.0.42:8332','https://127.0.0.1:18443',
    'http://example.com:18443','http://user:pass@127.0.0.1:18443',
    'http://127.0.0.1:18443/wallet/default',
    'http://127.0.0.1:18443/?param=true'
  ])assert.throws(()=>createRestrictedBvmBitcoinRpc({url,auth:'user:pass',fetchImpl}),/BVM_LOOPBACK_RPC_REQUIRED/)
  assert.throws(()=>createRestrictedBvmBitcoinRpc({url:'http://127.0.0.1:18443',auth:'',fetchImpl}),/BVM_RPC_AUTH_REQUIRED/)
})
