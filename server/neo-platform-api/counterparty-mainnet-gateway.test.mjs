import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {createNeoPlatformApi} from './server.mjs'
import {observeCounterpartyMainnet,COUNTERPARTY_MAINNET_URL} from '../neo-vm/counterparty-mainnet.mjs'

const payload=(overrides={})=>({result:{
  network:'mainnet',server_ready:true,ledger_state:'Following',
  backend_height:975100,counterparty_height:975100,...overrides
}})
function mockFetch(data=payload(),status=200,ready='true'){
 const requests=[]
 const fetchImpl=async(url,opts)=>{
  requests.push({url,opts})
  return {ok:status===200,status,headers:{get:key=>key==='content-length'?'180':key==='X-COUNTERPARTY-READY'?ready:null},text:async()=>JSON.stringify(data)}
 }
 return {fetchImpl,requests}
}
async function serve(options,fn){
 const result=mockFetch(options?.upstream)
 const server=createNeoPlatformApi({
  marketData:{snapshot:async()=>({})},
  subjectResolver:req=>req.headers.authorization==='Bearer mock-neopass'?'admin-1':null,
  authService:{session:async()=>({role:options?.role||'executive-admin',neopassStatus:'active'})},
  counterpartyMainnetGatewayEnabled:options?.enabled??true,
  counterpartyMainnetAllowedProjects:options?.allowed??['neo-counter'],
  counterpartyMainnetFetchImpl:result.fetchImpl
 })
 server.listen(0,'127.0.0.1');await once(server,'listening')
 try{await fn('http://127.0.0.1:'+server.address().port,result.requests)}
 finally{server.close();await once(server,'close')}
}
const route='/api/v1/bitcoin/counterparty/mainnet?scope=apps&project=neo-counter'
const headers={authorization:'Bearer mock-neopass'}
test('Counterparty observer uses the existing NEO mainnet API with GET only',async()=>{
 const {fetchImpl,requests}=mockFetch()
 const value=await observeCounterpartyMainnet({fetchImpl})
 assert.equal(value.source,COUNTERPARTY_MAINNET_URL)
 assert.equal(value.network,'bitcoin-mainnet')
 assert.equal(value.bitcoinHeight,975100)
 assert.equal(value.coreRpcVerified,false)
 assert.equal(value.sameOperatorNodeVerified,false)
 assert.equal(value.broadcastingEnabled,false)
 assert.deepEqual(requests.map(x=>x.url),[COUNTERPARTY_MAINNET_URL])
 assert.equal(requests[0].opts.method,'GET')
 assert.equal(requests[0].opts.redirect,'error')
 assert.equal(requests[0].opts.credentials,'omit')
})
test('fails closed on testnet, unready, lag, invalid heights or no JSON',async()=>{
 for(const datum of [
  payload({network:'testnet'}),payload({network:'signet'}),payload({server_ready:false}),
  payload({ledger_state:'Catching Up'}),payload({backend_height:975100,counterparty_height:975090}),
  payload({backend_height:0}),payload({counterparty_height:975101}),
  {result:{network:'mainnet'}}
 ]){
  await assert.rejects(()=>observeCounterpartyMainnet({fetchImpl:mockFetch(datum).fetchImpl}),
    /COUNTERPARTY_(NOT_BITCOIN_MAINNET|MAINNET_NOT_READY)/)
 }
 await assert.rejects(()=>observeCounterpartyMainnet({fetchImpl:async()=>{throw new Error('offline')}}),/COUNTERPARTY_MAINNET_UNAVAILABLE/)
})
test('off by default; unauthorized and unlisted projects never hit upstream',async()=>{
 await serve({enabled:false},async(base,calls)=>{
  const r=await fetch(base+route,{headers})
  assert.equal(r.status,404);assert.equal(calls.length,0)
 })
 await serve({},async(base,calls)=>{
  assert.equal((await fetch(base+route)).status,401)
  assert.equal((await fetch(base+route,{headers:{...headers,'sec-fetch-site':'cross-site'}})).status,403)
  assert.equal((await fetch(base+'/api/v1/bitcoin/counterparty/mainnet?scope=apps&project=gisd',{headers})).status,403)
  assert.equal((await fetch(base+route,{method:'POST',headers})).status,405)
  assert.equal((await fetch(base+route+'&debug=1',{headers})).status,400)
  assert.equal(calls.length,0)
 })
 await serve({role:'member'},async(base,calls)=>{
  assert.equal((await fetch(base+route,{headers})).status,403)
  assert.equal(calls.length,0)
 })
 await serve({allowed:[]},async(base,calls)=>{
  assert.equal((await fetch(base+route,{headers})).status,403)
  assert.equal(calls.length,0)
 })
})
test('authorized operator gets only read-only mainnet summary',async()=>{
 await serve({},async(base,calls)=>{
  const r=await fetch(base+route,{headers})
  assert.equal(r.status,200)
  const body=await r.json()
  assert.equal(body.service,'neo-core-counterparty-observer')
  assert.equal(body.network,'bitcoin-mainnet')
  assert.equal(body.protocol,'counterparty')
  assert.equal(body.readOnly,true)
  assert.equal(body.coreRpcVerified,false)
  assert.equal(body.sameOperatorNodeVerified,false)
  assert.equal(body.signingEnabled,false)
  assert.equal(body.broadcastingEnabled,false)
  assert.equal(r.headers.get('access-control-allow-origin'),null)
  assert.deepEqual(calls.map(x=>x.url),[COUNTERPARTY_MAINNET_URL])
 })
})
test('upstream failure cannot be advertised as healthy Bitcoin mainnet',async()=>{
 await serve({upstream:payload({network:'testnet'})},async(base,calls)=>{
  const r=await fetch(base+route,{headers})
  assert.equal(r.status,503)
  assert.deepEqual(await r.json(),{error:'counterparty_mainnet_not_ready'})
  assert.equal(calls.length,1)
 })
})
