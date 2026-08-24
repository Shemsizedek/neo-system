import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {buildEnvelope,postEnvelope,verifyEvent} from './agent.mjs'

const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519')
const privatePem=privateKey.export({type:'pkcs8',format:'pem'})
const publicPem=publicKey.export({type:'spki',format:'pem'})

test('signed envelope verifies and tampering fails',()=>{
  const env=buildEnvelope({agentId:'A1',minerId:'M1',type:'TELEMETRY',payload:{hashrateTh:100},privateKeyPem:privatePem})
  const {signature,...body}=env
  assert.equal(verifyEvent(body,signature,publicPem),true)
  assert.equal(verifyEvent({...body,minerId:'M2'},signature,publicPem),false)
})

test('gateway transport refuses insecure HTTP',async()=>{
  await assert.rejects(()=>postEnvelope('http://example.test/events',{}),/HTTPS/)
})

test('gateway transport posts JSON over HTTPS',async()=>{
  let received
  const fakeFetch=async(url,init)=>{
    received={url,init}
    return {ok:true,json:async()=>({ok:true})}
  }
  const result=await postEnvelope('https://example.test/events',{hello:'world'},fakeFetch)
  assert.equal(received.url,'https://example.test/events')
  assert.equal(received.init.method,'POST')
  assert.deepEqual(JSON.parse(received.init.body),{hello:'world'})
  assert.deepEqual(result,{ok:true})
})
