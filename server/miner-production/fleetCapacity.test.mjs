import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {buildEnvelope} from '../miner-agent/agent.mjs'
import {
  createEnrollmentChallenge,verifyEnrollmentChallenge,enrollMiner,registerTelemetry,
  registerSignedTelemetry,fleetCapacitySnapshot
} from './fleet.mjs'

const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
const publicKeyPem=publicKey.export({format:'pem',type:'spki'})
const privateKeyPem=privateKey.export({format:'pem',type:'pkcs8'})
const payload={hashrateTh:90,powerW:2800,temperatureC:65,poolConnected:true,source:'ANTMINER_STYLE'}
function enrolled(){
  const challenge=verifyEnrollmentChallenge(
    createEnrollmentChallenge({minerId:'NEO-ASIC-01',publicKey:publicKeyPem}),
    {signature:'enrollment-proof',verifySignature:()=>true}
  )
  return enrollMiner({challenge,model:'TEST-ASIC'})
}
function envelope(){return buildEnvelope({agentId:'AG-01',minerId:'NEO-ASIC-01',type:'TELEMETRY',payload,privateKeyPem})}

test('signed fresh telemetry is verified, but physical attestation remains a separate gate',()=>{
  const signed=registerSignedTelemetry(enrolled(),envelope())
  assert.equal(signed.telemetryVerified,true)
  assert.equal(fleetCapacitySnapshot([signed]).eligibleHashrateTh,0)
  const attested={...signed,hardwareVerified:true}
  const verified=fleetCapacitySnapshot([attested])
  assert.equal(verified.status,'VERIFIED')
  assert.equal(verified.eligibleHashrateTh,90)
  assert.equal(verified.eligibleMiners,1)
})

test('legacy unsigned telemetry is observational and never contract capacity',()=>{
  const legacy=registerTelemetry(enrolled(),payload)
  assert.equal(legacy.telemetryVerified,false)
  assert.equal(fleetCapacitySnapshot([{...legacy,hardwareVerified:true}]).eligibleHashrateTh,0)
})

test('signature tampering, wrong miner and replay are rejected',()=>{
  const current=enrolled()
  const event=envelope()
  assert.throws(()=>registerSignedTelemetry(current,{...event,payload:{...payload,hashrateTh:100}}),/SIGNATURE_INVALID/)
  assert.throws(()=>registerSignedTelemetry(current,{...event,minerId:'OTHER'}),/INVALID_SIGNED_TELEMETRY/)
  const first=registerSignedTelemetry(current,event)
  assert.throws(()=>registerSignedTelemetry(first,event),/TELEMETRY_REPLAY/)
})

test('stale, future, overheated and disconnected miners fail closed',()=>{
  const current=enrolled(), event=envelope()
  const signed=registerSignedTelemetry(current,event)
  const t=Date.parse(signed.lastSignedAt)
  assert.throws(()=>registerSignedTelemetry(current,event,{nowMs:t+61_000}),/STALE_OR_FUTURE/)
  assert.throws(()=>registerSignedTelemetry(current,event,{nowMs:t-6_000}),/STALE_OR_FUTURE/)
  const attested={...signed,hardwareVerified:true}
  assert.equal(fleetCapacitySnapshot([attested],{nowMs:t+61_000}).eligibleHashrateTh,0)
  assert.equal(fleetCapacitySnapshot([{...attested,telemetry:{...attested.telemetry,temperatureC:85}}]).eligibleHashrateTh,0)
  assert.equal(fleetCapacitySnapshot([{...attested,telemetry:{...attested.telemetry,poolConnected:false}}]).eligibleHashrateTh,0)
})

test('simulated or invalid readings are blocked before signature attribution',()=>{
  const base=enrolled()
  assert.throws(()=>registerSignedTelemetry(base,{...envelope(),payload:{...payload,simulation:true}}),/INVALID_TELEMETRY_PAYLOAD/)
  assert.throws(()=>registerSignedTelemetry(base,{...envelope(),payload:{...payload,hashrateTh:Infinity}}),/INVALID_TELEMETRY_MEASUREMENTS/)
  assert.throws(()=>registerSignedTelemetry(base,{...envelope(),payload:{...payload,source:'REFERENCE_ADAPTER'}}),/UNAPPROVED_HASHING_ADAPTER/)
})
