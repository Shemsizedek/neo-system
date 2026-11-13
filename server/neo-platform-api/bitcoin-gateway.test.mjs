import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createNeoPlatformApi} from './server.mjs'

const chain={chain:'main',blocks:900000,headers:900000,initialblockdownload:false}
function fixture({enabled=true,allowedProjects=['neo-counter'],chainState=chain,role='executive-admin'}={}){
 const calls=[]
 const rpc=async method=>{
  calls.push(method)
  if(method==='getblockchaininfo')return chainState
  if(method==='getnetworkinfo')return {version:280000,networkactive:true}
  throw new Error('forbidden method: '+method)
 }
 const server=createNeoPlatformApi({
  bitcoinGatewayEnabled:enabled,bitcoinGatewayRpc:rpc,
  bitcoinGatewayAllowedProjects:allowedProjects,
  subjectResolver:req=>req.headers.authorization==='Bearer test-auth'?'subject-1':null,
  authService:{session:async()=>({role,neopassStatus:'active'})},
  marketData:{snapshot:async()=>({})}
 })
 return {server,calls}
}
async function withGateway(options,check){
 const {server,calls}=fixture(options)
 server.listen(0,'127.0.0.1');await once(server,'listening')
 const base='http://127.0.0.1:'+server.address().port
 try{await check(base,calls)}finally{server.close();await once(server,'close')}
}
const path='/api/v1/bitcoin/chain?scope=apps&project=neo-counter'
test('disabled gateway is not discoverable and never calls RPC',async()=>{
 await withGateway({enabled:false},async(base,calls)=>{
  const r=await fetch(base+path,{headers:{authorization:'Bearer test-auth'}})
  assert.equal(r.status,404);assert.deepEqual(calls,[])
 })
})
test('enabled gateway requires verified identity, operator role and explicit project allowlist',async()=>{
 await withGateway({},async(base,calls)=>{
  assert.equal((await fetch(base+path)).status,401)
  assert.equal((await fetch(base+path,{headers:{authorization:'Bearer test-auth','sec-fetch-site':'cross-site'}})).status,403)
  assert.equal((await fetch(base+'/api/v1/bitcoin/chain?scope=apps&project=gisd',{headers:{authorization:'Bearer test-auth'}})).status,403)
  assert.deepEqual(calls,[])
 })
 await withGateway({role:'member'},async(base,calls)=>{
  assert.equal((await fetch(base+path,{headers:{authorization:'Bearer test-auth'}})).status,403)
  assert.deepEqual(calls,[])
 })
})
test('gateway accepts known project for read-only chain evidence, without revealing credentials',async()=>{
 await withGateway({},async(base,calls)=>{
  const response=await fetch(base+path,{headers:{authorization:'Bearer test-auth'}})
  assert.equal(response.status,200)
  const body=await response.json()
  assert.equal(body.node.chain,'main')
  assert.equal(body.readOnly,true)
  assert.equal(body.signingEnabled,false)
  assert.equal(body.broadcastingEnabled,false)
  assert.deepEqual(calls,['getblockchaininfo','getnetworkinfo'])
  assert.equal(JSON.stringify(body).includes('password'),false)
 })
})
test('gateway fails closed on wrong Bitcoin chain, incomplete sync, unconfigured projects and non-GET',async()=>{
 for(const status of [
  {...chain,chain:'regtest'},
  {...chain,initialblockdownload:true},
  {...chain,headers:900100}
 ]){
  await withGateway({chainState:status},async(base)=>{
   assert.equal((await fetch(base+path,{headers:{authorization:'Bearer test-auth'}})).status,503)
  })
 }
 await withGateway({allowedProjects:[]},async(base,calls)=>{
  assert.equal((await fetch(base+path,{headers:{authorization:'Bearer test-auth'}})).status,403)
  assert.deepEqual(calls,[])
  assert.equal((await fetch(base+path,{method:'POST',headers:{authorization:'Bearer test-auth'}})).status,405)
 })
})
