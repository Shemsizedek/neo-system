import test from 'node:test'
import assert from 'node:assert/strict'
import {attestBitcoinCounterpartyMainnet} from './mainnet-attestation.mjs'

const core={chain:'main',blocks:975101,headers:975101,initialblockdownload:false}
function fixture({chain=core,network={networkactive:true},counterparty={},error=false}={}){
 const calls=[]
 const bitcoinRpc=async(method,params)=>{
   calls.push(method)
   assert.deepEqual(params,[])
   if(method==='getblockchaininfo')return chain
   if(method==='getnetworkinfo')return network
   throw Error('unexpected rpc method '+method)
 }
 const counterpartyFetch=async(url,opts)=>{
   calls.push('counterparty-http')
   assert.equal(url,'https://api.counterparty.io:4000/v2/')
   assert.equal(opts.method,'GET')
   assert.equal(opts.redirect,'error')
   if(error)throw Error('unreachable')
   return {
     ok:true,headers:{get:()=>null},
     text:async()=>JSON.stringify({result:{
       network:'mainnet',backend_height:975100,counterparty_height:975100,
       server_ready:true,ledger_state:'Following',...counterparty
     }})
   }
 }
 return {bitcoinRpc,counterpartyFetch,calls}
}
test('corroborates only read-only mainnet heights without claiming shared node',async()=>{
 const v=fixture()
 const result=await attestBitcoinCounterpartyMainnet({...v,now:()=> '2026-10-30T00:00:00.000Z'})
 assert.equal(result.network,'bitcoin-mainnet')
 assert.equal(result.heightDrift,1)
 assert.equal(result.heightsConsistent,true)
 assert.equal(result.coreChainVerified,true)
 assert.equal(result.counterpartyNetworkVerified,true)
 assert.equal(result.sameTipHashVerified,false)
 assert.equal(result.sameOperatorNodeVerified,false)
 assert.equal(result.coreIdentityVerified,false)
 assert.equal(result.signingEnabled,false)
 assert.equal(result.broadcastingEnabled,false)
 assert.deepEqual(v.calls,['getblockchaininfo','getnetworkinfo','counterparty-http'])
})
test('rejects signet, regtest, testnet and any unsynced Core before contacting Counterparty',async()=>{
 for(const state of [
  {...core,chain:'regtest'}, {...core,chain:'signet'}, {...core,chain:'test'},
  {...core,initialblockdownload:true},{...core,headers:975130},
  {...core,blocks:0},{...core,headers:975100}
 ]){
  const v=fixture({chain:state})
  await assert.rejects(()=>attestBitcoinCounterpartyMainnet(v),/MAINNET_ATTESTATION_CORE_/)
  assert.equal(v.calls.includes('counterparty-http'),false)
 }
})
test('rejects offline Core and refuses to consult Counterparty',async()=>{
 const v=fixture({network:{networkactive:false}})
 await assert.rejects(()=>attestBitcoinCounterpartyMainnet(v),/MAINNET_ATTESTATION_CORE_NETWORK_INACTIVE/)
 assert.deepEqual(v.calls,['getblockchaininfo','getnetworkinfo'])
})
test('rejects different Counterparty chain and stale API backend',async()=>{
 for(const state of [
  {network:'testnet'},
  {backend_height:975040,counterparty_height:975040},
  {server_ready:false},
  {ledger_state:'Stopped'}
 ]){
   const v=fixture({counterparty:state})
   await assert.rejects(()=>attestBitcoinCounterpartyMainnet(v),/COUNTERPARTY_|MAINNET_/)
 }
})
test('rejects inconsistent heights even when both sources claim mainnet ready',async()=>{
 const v=fixture({counterparty:{backend_height:975090,counterparty_height:975090}})
 await assert.rejects(()=>attestBitcoinCounterpartyMainnet(v),/MAINNET_ATTESTATION_HEIGHT_DIVERGENCE/)
 assert.equal(v.calls.includes('counterparty-http'),true)
})
test('rejects bad drift policies and never calls RPC for invalid policy',async()=>{
 for(const maxBlockDrift of [-1,3,0.5,NaN,Infinity]){
   const v=fixture()
   await assert.rejects(()=>attestBitcoinCounterpartyMainnet({...v,maxBlockDrift}),/MAINNET_ATTESTATION_DRIFT_POLICY_INVALID/)
   assert.deepEqual(v.calls,[])
 }
})
test('fails when the source API is unavailable and never claims attestation',async()=>{
 const v=fixture({error:true})
 await assert.rejects(()=>attestBitcoinCounterpartyMainnet(v),/COUNTERPARTY_MAINNET_UNAVAILABLE/)
})
test('rejects absent or invalid Bitcoin Core transport',async()=>{
 await assert.rejects(()=>attestBitcoinCounterpartyMainnet({}),/BVM_BITCOIN_RPC_REQUIRED/)
})
