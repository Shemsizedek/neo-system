import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {buildEnvelope} from './agent.mjs'
import {ReplayWindow,telemetryToGatewayRecord,verifyAgentEnvelope} from './gateway.mjs'

const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519')
const privatePem=privateKey.export({type:'pkcs8',format:'pem'})
const publicPem=publicKey.export({type:'spki',format:'pem'})
const registry=[{agentId:'A1',minerId:'M1',enabled:true,publicKeyPem:publicPem}]

test('gateway accepts signed fresh envelope once',()=>{
  const envelope=buildEnvelope({agentId:'A1',minerId:'M1',type:'TELEMETRY',payload:{hashrateTh:120,powerW:3300},privateKeyPem:privatePem})
  const replay=new ReplayWindow()
  const first=verifyAgentEnvelope(envelope,registry,replay)
  assert.equal(first.ok,true)
  const second=verifyAgentEnvelope(envelope,registry,replay)
  assert.equal(second.ok,false)
  assert.equal(second.reason,'Replay detected')
})

test('gateway rejects unknown agent',()=>{
  const envelope=buildEnvelope({agentId:'BAD',minerId:'M1',type:'TELEMETRY',payload:{hashrateTh:120},privateKeyPem:privatePem})
  const result=verifyAgentEnvelope(envelope,registry,new ReplayWindow())
  assert.equal(result.ok,false)
  assert.match(result.reason,/Unknown/)
})

test('verified telemetry normalizes to gateway record',()=>{
  const event={agentId:'A1',minerId:'M1',type:'TELEMETRY',occurredAt:new Date().toISOString(),nonce:'n',payload:{hashrateTh:120,powerW:3300,temperatureC:68},verified:true}
  const row=telemetryToGatewayRecord(event)
  assert.equal(row.minerId,'M1')
  assert.equal(row.hashrateTh,120)
  assert.equal(row.verified,true)
})
