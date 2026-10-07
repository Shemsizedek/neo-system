import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import {once} from 'node:events'
import {handleNeoExchangeRequest} from './server.mjs'

async function call(authorizer){
  const server=http.createServer((req,res)=>handleNeoExchangeRequest(req,res,{crownAuthorizer:authorizer}))
  server.listen(0,'127.0.0.1');await once(server,'listening')
  try{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/api/neo-exchange/orders/compose`,{method:'POST'})
    return{status:response.status,body:await response.json()}
  }finally{server.close();await once(server,'close')}
}

test('NEO DEX order boundary fails closed when Crown denies order authority',async()=>{
  const out=await call(async scope=>{assert.equal(scope,'neo-dex.order.request');return{verified:false,error:'crown_capability_denied'}})
  assert.equal(out.status,403)
  assert.equal(out.body.required_scope,'neo-dex.order.request')
})

test('NEO DEX remains non-executing even after Crown order authority proof',async()=>{
  const out=await call(async()=>({verified:true}))
  assert.equal(out.status,501)
  assert.equal(out.body.crown_capability_verified,true)
  assert.equal(out.body.broadcast,false)
  assert.equal(out.body.code,'SIGNING_GATE_NOT_ENABLED')
})
