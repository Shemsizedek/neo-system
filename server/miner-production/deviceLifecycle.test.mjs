import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PersistentStateStore,hydrateMap} from './persistentStore.mjs'
import {canonicalPayload,buildEnvelope} from '../miner-agent/agent.mjs'
import {createEnrollmentChallenge,verifyEnrollmentChallenge,enrollMiner,
  registerDeviceConsent,registerSignedTelemetry,revokeFleetDevice,
  mobileFleetView,fleetCapacitySnapshot,FLEET_CONSENT_SCOPE} from './fleet.mjs'

const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
const pub=publicKey.export({type:'spki',format:'pem'})
const priv=privateKey.export({type:'pkcs8',format:'pem'})
const asic={hashrateTh:80,powerW:2800,temperatureC:65,poolConnected:true,source:'ANTMINER_STYLE'}
const makeMiner=()=>{
  const challenge=verifyEnrollmentChallenge(createEnrollmentChallenge({minerId:'MG003-DEVICE',publicKey:pub}),{
    signature:'proof',verifySignature:()=>true
  })
  return enrollMiner({challenge,serial:'SENSITIVE-SERIAL',model:'ASIC'})
}
const consentEnvelope=(miner,overrides={})=>{
  const fields={
    type:'FLEET_CONSENT',minerId:miner.id,scope:FLEET_CONSENT_SCOPE,
    accepted:true,nonce:crypto.randomBytes(24).toString('hex'),
    occurredAt:new Date().toISOString(),...overrides
  }
  return {...fields,signature:crypto.sign(null,Buffer.from(canonicalPayload(fields)),priv).toString('base64')}
}

test('positive cryptographically verified opt-in required before counting device hashrate',()=>{
  const miner=makeMiner()
  const signed=registerSignedTelemetry(miner,buildEnvelope({
    agentId:'AGENT',minerId:miner.id,type:'TELEMETRY',payload:asic,privateKeyPem:priv
  }))
  assert.equal(fleetCapacitySnapshot([{...signed,hardwareVerified:true}]).eligibleHashrateTh,0)
  const optIn=registerDeviceConsent(signed,consentEnvelope(signed))
  assert.equal(optIn.consentVerified,true)
  assert.equal(optIn.hardwareVerified,false)
  assert.equal(fleetCapacitySnapshot([optIn]).eligibleHashrateTh,0)
  const capacity=fleetCapacitySnapshot([{...optIn,hardwareVerified:true}])
  assert.equal(capacity.eligibleHashrateTh,80)
})

test('invalid, stale, mismatched and replayed opt-in cannot grant consent',()=>{
  const miner=makeMiner()
  assert.throws(()=>registerDeviceConsent(miner,{...consentEnvelope(miner),accepted:false}),/INVALID_DEVICE_CONSENT/)
  const valid=consentEnvelope(miner)
  assert.throws(()=>registerDeviceConsent(miner,{...valid,scope:'ALL_DEVICE_CONTROL'}),/INVALID_DEVICE_CONSENT/)
  assert.throws(()=>registerDeviceConsent(miner,{...valid,minerId:'OTHER'}),/INVALID_DEVICE_CONSENT/)
  assert.throws(()=>registerDeviceConsent(miner,{...valid,signature:'tampered'}),/SIGNATURE_INVALID/)
  assert.throws(()=>registerDeviceConsent(miner,valid,{nowMs:Date.now()+301_000}),/STALE_OR_FUTURE/)
  // The operator gateway appends actor context to a signed device message.
  const granted=registerDeviceConsent(miner,{...valid,operatorId:'trusted-operator'})
  assert.throws(()=>registerDeviceConsent(granted,valid),/ALREADY_RECORDED/)
})

test('operator revocation immediately removes capacity and rejects all subsequent signed telemetry',()=>{
  const miner=makeMiner()
  const signed=registerSignedTelemetry(miner,buildEnvelope({
    agentId:'AGENT',minerId:miner.id,type:'TELEMETRY',payload:asic,privateKeyPem:priv
  }))
  const opted=registerDeviceConsent(signed,consentEnvelope(signed))
  const active={...opted,hardwareVerified:true}
  assert.equal(fleetCapacitySnapshot([active]).eligibleHashrateTh,80)
  assert.throws(()=>revokeFleetDevice(active,{operatorId:'operator'}),/REVOCATION_REASON_REQUIRED/)
  const revoked=revokeFleetDevice(active,{operatorId:'operator',reason:'Owner withdrew authorization'})
  assert.equal(revoked.state,'REVOKED')
  assert.equal(revoked.telemetry,null)
  assert.equal(fleetCapacitySnapshot([revoked]).eligibleHashrateTh,0)
  assert.throws(()=>registerSignedTelemetry(revoked,buildEnvelope({
    agentId:'AGENT',minerId:revoked.id,type:'TELEMETRY',payload:asic,privateKeyPem:priv
  })),/MINER_IDENTITY_NOT_VERIFIED/)
  assert.throws(()=>registerDeviceConsent(revoked,consentEnvelope(revoked)),/MINER_CONSENT_NOT_ALLOWED/)
})

test('enrollment state, anti-replay timestamp, consent and revocation survive sqlite restarts',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-mg003-'))
  const path=join(dir,'fleet.sqlite')
  try{
    const s1=new PersistentStateStore(path)
    const first=registerSignedTelemetry(makeMiner(),buildEnvelope({
      agentId:'AGENT',minerId:'MG003-DEVICE',type:'TELEMETRY',payload:asic,privateKeyPem:priv
    }))
    const stored=registerDeviceConsent(first,consentEnvelope(first))
    s1.put('miner_device',stored.id,stored,{action:'DEVICE_CONSENT'})
    s1.close()
    const s2=new PersistentStateStore(path)
    const row=hydrateMap(s2,'miner_device').get(stored.id)
    assert.equal(row.consentVerified,true)
    assert.equal(row.lastSignedAt,stored.lastSignedAt)
    const replay=buildEnvelope({agentId:'AGENT',minerId:stored.id,type:'TELEMETRY',payload:asic,privateKeyPem:priv})
    // Replay window refuses older/equal signed timestamps even after restart.
    replay.occurredAt=stored.lastSignedAt
    assert.throws(()=>registerSignedTelemetry(row,replay),/TELEMETRY_REPLAY/)
    const revoked=revokeFleetDevice(row,{operatorId:'op',reason:'Withdrawn by authorized device controller'})
    s2.put('miner_device',row.id,revoked,{action:'MINER_ACCESS_REVOKED'})
    s2.close()
    const s3=new PersistentStateStore(path)
    const persisted=s3.get('miner_device',row.id)
    assert.equal(persisted.state,'REVOKED')
    assert.equal(persisted.consentVerified,false)
    assert.equal(fleetCapacitySnapshot([persisted]).eligibleHashrateTh,0)
    assert.ok(s3.audit().some(a=>a.action==='MINER_ACCESS_REVOKED'))
    s3.close()
  }finally{rmSync(dir,{recursive:true,force:true})}
})

test('mobile fleet view omits sensitive identifiers and never presents unverified capacity',()=>{
  const m={...makeMiner(),state:'ONLINE',identityKey:'SECRET-PUBLIC-KEY',serial:'secret-serial',
    telemetry:{...asic},lastSignedAt:new Date().toISOString(),telemetryVerified:true}
  const view=mobileFleetView([m])
  assert.equal(view.mode,'AUTHENTICATED_READ_ONLY')
  assert.equal(view.verifiedHashrateTh,0)
  assert.equal(view.devices[0].hashrateTh,null)
  assert.equal(view.devices[0].state,'NOT_ATTESTED_OR_NOT_CONSENTED')
  assert.equal(JSON.stringify(view).includes('secret-serial'),false)
  assert.equal(JSON.stringify(view).includes('SECRET-PUBLIC-KEY'),false)
})
