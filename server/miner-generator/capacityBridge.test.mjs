import test from 'node:test'
import assert from 'node:assert/strict'
import {readGeneratorCapacity,verifyCapacityFeed,capacityBridgeConfig} from './capacityBridge.mjs'

const clock=Date.parse('2026-10-23T17:00:00.000Z')
const env={NEO_GENERATOR_CAPACITY_URL:'https://telemetry.example/capacity',NEO_GENERATOR_CAPACITY_TOKEN:'a'.repeat(64),NEO_GENERATOR_RESERVE_PCT:'10'}
const feed={source:'SIGNED_AGENT_FLEET',status:'VERIFIED',eligibleMiners:2,eligibleHashrateTh:100,generatedAt:new Date(clock).toISOString()}
const response=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}})

test('bridge requires exact HTTPS endpoint, paired token and bounded reserve',()=>{
  assert.throws(()=>capacityBridgeConfig({...env,NEO_GENERATOR_CAPACITY_URL:'http://telemetry.example/capacity'}),/HTTPS/)
  assert.throws(()=>capacityBridgeConfig({...env,NEO_GENERATOR_CAPACITY_URL:'https://telemetry.example/other'}),/HTTPS/)
  assert.throws(()=>capacityBridgeConfig({...env,NEO_GENERATOR_CAPACITY_TOKEN:'short'}),/AUTH_CONFIGURATION/)
  assert.throws(()=>capacityBridgeConfig({...env,NEO_GENERATOR_RESERVE_PCT:'-1'}),/RESERVE_PCT/)
})

test('fresh authenticated verified capacity is read-only and preserves reserve',async()=>{
  let request
  const result=await readGeneratorCapacity({env,nowMs:clock,fetchImpl:async(url,options)=>{
    request={url,options}
    return response({...feed,credential:'do-not-forward'})
  }})
  assert.equal(request.url,env.NEO_GENERATOR_CAPACITY_URL)
  assert.equal(request.options.headers.authorization,'Bearer '+env.NEO_GENERATOR_CAPACITY_TOKEN)
  assert.equal(request.options.redirect,'error')
  assert.equal(result.available,true)
  assert.equal(result.totalHashrateTh,100)
  assert.equal(result.reserveHashrateTh,10)
  assert.equal(result.allocatableHashrateTh,90)
  assert.equal(result.contractActivationEnabled,false)
  assert.equal(JSON.stringify(result).includes('do-not-forward'),false)
})

test('missing config and unavailable source have no allocatable hashrate',async()=>{
  const missing=await readGeneratorCapacity({env:{},nowMs:clock})
  assert.equal(missing.available,false)
  assert.equal(missing.allocatableHashrateTh,null)
  const denied=await readGeneratorCapacity({env,nowMs:clock,fetchImpl:async()=>new Response('',{status:401})})
  assert.equal(denied.available,false)
  assert.equal(denied.status,'MINER_CAPACITY_SOURCE_UNAVAILABLE')
})

test('stale, future, unsigned, forged and blocked feeds fail closed',async()=>{
  for(const data of [
    {...feed,generatedAt:new Date(clock-61_000).toISOString()},
    {...feed,generatedAt:new Date(clock+6_000).toISOString()},
    {...feed,source:'UNVERIFIED'},
    {...feed,eligibleHashrateTh:NaN},
    {...feed,status:'BLOCKED'},
    {...feed,eligibleMiners:0}
  ]){
    const result=await readGeneratorCapacity({env,nowMs:clock,fetchImpl:async()=>response(data)})
    assert.equal(result.available,false)
    assert.equal(result.allocatableHashrateTh,null)
  }
})

test('transport errors and malformed JSON cannot produce contract capacity',async()=>{
  const broken=await readGeneratorCapacity({env,nowMs:clock,fetchImpl:async()=>{throw new Error('offline')}})
  assert.equal(broken.available,false)
  const corrupt=await readGeneratorCapacity({env,nowMs:clock,fetchImpl:async()=>new Response('{bad')})
  assert.equal(corrupt.allocatableHashrateTh,null)
  assert.equal(verifyCapacityFeed(feed,{nowMs:clock}).ok,true)
})
