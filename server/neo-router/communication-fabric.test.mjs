import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createCommunicationEnvelope,routeCommunication,minimizePayload,createMemoryCommunicationStore,communicate,buildEscalation} from './communication-fabric.mjs'

const policy=JSON.parse(fs.readFileSync('architecture/neo-communications-policy.json','utf8'))

test('routes runtime failures only to relevant systems',()=>{
  const envelope=createCommunicationEnvelope({eventType:'RUNTIME_FAILURE',source:'gate-103',payload:{service:'neo-bank'}})
  const routed=routeCommunication(envelope,policy)
  assert.deepEqual(routed.recipients,['NEO-ROUTER','NEO-GUARDIAN','NEO-SCAN'])
  assert.equal(routed.priority,'CRITICAL')
})

test('unknown events default to NEO Scan only',()=>{
  const routed=routeCommunication(createCommunicationEnvelope({eventType:'NEW_EVENT',source:'test'}),policy)
  assert.deepEqual(routed.recipients,['NEO-SCAN'])
  assert.equal(routed.route_status,'DEFAULTED')
})

test('sensitive payload fields are redacted before delivery',()=>{
  const envelope=minimizePayload(createCommunicationEnvelope({eventType:'SECURITY_EVENT',source:'test',payload:{token:'abc',detail:'ok'}}))
  assert.equal(envelope.payload.token,'[REDACTED]')
  assert.equal(envelope.payload.detail,'ok')
})

test('duplicate events are delivered only once',async()=>{
  const store=createMemoryCommunicationStore(), delivered=[]
  const event={eventId:'EVT-1',eventType:'IMPLEMENTATION_GAP',source:'gate-101',payload:{id:'G101-100'}}
  const first=await communicate({event,policy,store,deliver:async x=>(delivered.push(x),{ok:true,recipient:x.recipient})})
  const second=await communicate({event,policy,store,deliver:async x=>(delivered.push(x),{ok:true,recipient:x.recipient})})
  assert.equal(first.duplicate,false)
  assert.equal(second.duplicate,true)
  assert.equal(delivered.length,2)
})

test('critical events produce operator escalation intent',()=>{
  const routed=routeCommunication(createCommunicationEnvelope({eventType:'RECOVERY_FAILED',source:'gate-104'}),policy)
  const escalation=buildEscalation(routed)
  assert.equal(escalation.escalate,true)
  assert.equal(escalation.destination,'OPERATOR')
})
