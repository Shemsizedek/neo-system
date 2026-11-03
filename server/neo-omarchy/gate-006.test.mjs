import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync, randomBytes, sign, verify } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createDeviceBoundNEOpassVerifier, proofBytes, devicePossessionBytes } from './device-attestation-006.mjs'
import { createStagingDeviceEnrollment } from './device-enrollment-006.mjs'
import { createOperatorApprovalVerifier, operatorApprovalBytes } from './operator-approval.mjs'
import { createPostgresOmarchyLeases } from './postgres-leases.mjs'
import { createOmarchyTrustStore } from './trust-store.mjs'
import { createOmarchyStagingCoordinator } from './staging-coordinator.mjs'
import { createSignedOutboundTransport } from './private-transport.mjs'
import { createOutboundOmarchyWorker } from './outbound-worker.mjs'
import { runOmarchyLocalPilot } from '../../scripts/neo-omarchy-pilot-006.mjs'

const machineId='neo:machine:omarchy-006-ci'
const issuer='neopass:staging-lab'
const operator='neo:operator:omarchy-006-reviewer'
const nowMs=Date.now()
const nonce=()=>randomBytes(32).toString('hex')
const keys={
  issuer:generateKeyPairSync('ed25519'),
  device:generateKeyPairSync('ed25519'),
  otherDevice:generateKeyPairSync('ed25519'),
  operator:generateKeyPairSync('ed25519'),
  server:generateKeyPairSync('ed25519'),
}
const pem=(key,privateKey=false)=>key.export({
  format:'pem',type:privateKey?'pkcs8':'spki',
})
const fingerprint=key=>createHash('sha256')
  .update(key.export({format:'der',type:'spki'})).digest('hex')
const deviceVerifier=(isRevoked=async()=>false)=>createDeviceBoundNEOpassVerifier({
  issuer,keyId:'lab-issuer-key-1',publicKeyPem:pem(keys.issuer.publicKey),
  isRevoked,now:()=>nowMs,
})
const operatorVerifier=()=>createOperatorApprovalVerifier({
  publicKeyPem:pem(keys.operator.publicKey),keyId:'lab-operator-key-1',
  revokedKeyIds:async()=>false,now:()=>nowMs,
})
function signedProof({device=keys.device,challengeNonce,proofId=nonce(),override={}}={}) {
  const publicKeyFingerprint=fingerprint(device.publicKey)
  const claims={
    schema:'NEO-OMARCHY-DEVICE-PROOF-006',
    aud:'neo-omarchy-device-006',iss:issuer,sub:machineId,
    nonce:challengeNonce,cnf:publicKeyFingerprint,jti:proofId,
    scope:'omarchy:device:enroll',iat:nowMs-500,
    exp:nowMs+120_000,...override,
  }
  const raw=proofBytes(claims)
  const proof={
    keyId:'lab-issuer-key-1',algorithm:'Ed25519',
    payload:raw.toString('base64url'),
    signature:sign(null,raw,keys.issuer.privateKey).toString('base64url'),
  }
  const possessionSignature=sign(null,devicePossessionBytes({
    machineId,nonce:challengeNonce,proofId:claims.jti,
    publicKeyFingerprint,
  }),device.privateKey).toString('base64url')
  return {proof,devicePublicKeyPem:pem(device.publicKey),possessionSignature}
}
function approval(action,target,approvalNonce=nonce()) {
  const scopes={
    'machine.approve':'omarchy:machine:approve',
    'machine.revoke':'omarchy:machine:revoke',
    'task.queue':'omarchy:task:queue',
  }
  const claims={
    schema:'NEO-OMARCHY-APPROVAL-005',
    aud:'neo-omarchy-staging',environment:'staging',
    subject:operator,action,target,scope:scopes[action],nonce:approvalNonce,
    iat:nowMs-500,exp:nowMs+60_000,
  }
  const raw=operatorApprovalBytes(claims)
  return {
    keyId:'lab-operator-key-1',payload:raw.toString('base64url'),
    signature:sign(null,raw,keys.operator.privateKey).toString('base64url'),
  }
}

test('NEOpass device proof verifies issuer, key confirmation and private-key possession',async()=>{
  const challengeNonce=nonce()
  const valid=signedProof({challengeNonce})
  const result=await deviceVerifier()({machineId,nonce:challengeNonce,...valid})
  assert.equal(result.verified,true)
  assert.equal(result.issuer,'NEOpass')
  assert.equal(result.deviceKeyFingerprint,fingerprint(keys.device.publicKey))
  for(const input of [
    { ...valid,devicePublicKeyPem:pem(keys.otherDevice.publicKey) },
    { ...valid,possessionSignature:sign(null,Buffer.from('wrong'),keys.device.privateKey).toString('base64url') },
    signedProof({challengeNonce,override:{exp:nowMs}}),
    signedProof({challengeNonce,override:{scope:'wallet.sign'}}),
    signedProof({challengeNonce,override:{aud:'wrong-audience'}}),
    signedProof({challengeNonce,override:{cnf:'0'.repeat(64)}}),
    signedProof({challengeNonce,override:{extra:'unsupported'}}),
  ]){
    const checked=await deviceVerifier()({machineId,nonce:challengeNonce,...input})
    assert.equal(checked.verified,false)
  }
  assert.equal((await deviceVerifier(async()=>true)({
    machineId,nonce:challengeNonce,...valid,
  })).verified,false)
  assert.equal((await deviceVerifier(async()=>undefined)({
    machineId,nonce:challengeNonce,...valid,
  })).verified,false)
})

test('manual local inference cannot start without explicit model review and Omarchy preflight',async()=>{
  const env={
    NEO_OMARCHY_PILOT_ENABLED:'1',NEO_OMARCHY_MODEL_APPROVED:'1',
    OLLAMA_BASE_URL:'http://127.0.0.1:11434',
    OLLAMA_MODEL:'test-omarchy',
  }
  let invoked=0
  const createAdapter=()=>({invoke:async()=>{invoked++;return {
    provider:'ollama',model:'test-omarchy',text:'test response',
  }}})
  const opts={
    env,preflight:()=>({status:'lab-preflight-passed'}),
    createAdapter,now:()=>nowMs,
  }
  const result=await runOmarchyLocalPilot(opts)
  assert.equal(result.result,'local_inference_responded')
  assert.equal(result.productionReady,false)
  assert.equal(result.liveNEOpassVerified,false)
  assert.equal(result.independentlyWitnessed,false)
  assert.equal(JSON.stringify(result).includes('test response'),false)
  assert.equal(invoked,1)
  for(const bad of [
    {...env,NEO_OMARCHY_PILOT_ENABLED:'0'},
    {...env,NEO_OMARCHY_MODEL_APPROVED:'0'},
    {...env,OLLAMA_BASE_URL:'https://example.com'},
    {...env,OLLAMA_BASE_URL:'http://0.0.0.0:11434'},
    {...env,OLLAMA_MODEL:'../../private'},
  ]) await assert.rejects(runOmarchyLocalPilot({...opts,env:bad}),/required|origin|model|port/)
  await assert.rejects(runOmarchyLocalPilot({
    ...opts,preflight:()=>({status:'blocked'}),
  }),/not_certified/)
  assert.equal(invoked,1)
})

test('Gate 006 verified device enrollment and single inference against disposable PostgreSQL', {
  skip:!process.env.NEO_OMARCHY_PG_TEST_URL, timeout:120_000,
},async()=>{
  const url=new URL(process.env.NEO_OMARCHY_PG_TEST_URL)
  // This integration test DROPS the whole NEO Omarchy schema. Hard guard.
  assert.equal(url.hostname,'127.0.0.1')
  assert.equal(url.pathname,'/neo_omarchy_ci')
  const {Pool}=await import('pg')
  const pool=new Pool({connectionString:url.href,max:5,ssl:false})
  try {
    const database=await pool.query('SELECT current_database() AS db')
    assert.equal(database.rows[0].db,'neo_omarchy_ci')
    await pool.query('DROP SCHEMA IF EXISTS neo_omarchy CASCADE')
    for(const file of ['postgres-leases.sql','postgres-005.sql','postgres-006.sql']){
      const sql=await readFile(new URL(file,import.meta.url),'utf8')
      await pool.query(sql)
    }
    const enrollment=createStagingDeviceEnrollment({
      pool,verifyDeviceProof:deviceVerifier(),
      verifyOperatorApproval:operatorVerifier(),now:()=>nowMs,
    })
    const challenge=await enrollment.createChallenge({machineId})
    assert.equal(challenge.audience,'neo-omarchy-device-006')
    const proof=signedProof({challengeNonce:challenge.nonce})
    const operatorEnvelope=approval('machine.approve',machineId)
    const registered=await enrollment.enroll({
      machineId,nonce:challenge.nonce,...proof,operatorEnvelope,
    })
    assert.equal(registered.state,'approved')
    assert.equal(registered.productionReady,false)
    await assert.rejects(enrollment.enroll({
      machineId,nonce:challenge.nonce,...proof,operatorEnvelope,
    }),/consumed/)
    await assert.rejects(enrollment.createChallenge({machineId}),/already_registered/)
    const machineRows=await pool.query(
      'SELECT signing_public_key,proof_id,approved_by FROM neo_omarchy.machines WHERE machine_id=$1',
      [machineId],
    )
    assert.equal(machineRows.rows.length,1)
    assert.equal(machineRows.rows[0].signing_public_key,pem(keys.device.publicKey))
    assert.equal(machineRows.rows[0].approved_by,operator)
    const trust=createOmarchyTrustStore({pool,now:()=>nowMs})
    const registeredKey=await trust.machinePublicKey(machineId)
    const evidence=Buffer.from('NEO-OMARCHY-006:challenge')
    assert.equal(verify(null,evidence,registeredKey,
      sign(null,evidence,keys.device.privateKey)),true)
    const leases=createPostgresOmarchyLeases({pool,now:()=>nowMs})
    const controller=createOmarchyStagingCoordinator({
      leases,trustStore:trust,verifyOperatorApproval:operatorVerifier(),
      serverPrivateKeyPem:pem(keys.server.privateKey,true),now:()=>nowMs,
    })
    await controller.queueApprovedTask({
      taskId:'pilot006',objective:'Describe a harmless local model test',
      maxTokens:48,operatorEnvelope:approval('task.queue','pilot006'),
    })
    const fetchImpl=async (endpoint,request)=>{
      assert.equal(String(endpoint),'https://coordinator.neo.internal/private/v1/worker')
      const result=await controller.handleWorkerEnvelope(JSON.parse(request.body))
      return {
        ok:true,status:200,headers:{get:()=> 'application/json'},
        text:async()=>JSON.stringify(result),
      }
    }
    const transport=createSignedOutboundTransport({
      origin:'https://coordinator.neo.internal',
      expectedHost:'coordinator.neo.internal',machineId,
      machinePrivateKeyPem:pem(keys.device.privateKey,true),
      serverPublicKeyPem:pem(keys.server.publicKey),
      fetchImpl,now:()=>nowMs,
    })
    let calls=0
    const worker=createOutboundOmarchyWorker({
      machineId,now:()=>nowMs,
      pollLease:transport.pollLease,
      submitReceipt:transport.submitReceipt,
      invokeLocalInference:async ({capability})=>{
        calls++
        assert.equal(capability,'local-inference')
        return {text:'synthetic only — no live local model'}
      },
    })
    const result=await worker.runOnce()
    assert.equal(result.status,'completed')
    assert.equal((await worker.runOnce()).status,'idle')
    assert.equal(calls,1)
    const stored=await pool.query('SELECT state,attempts FROM neo_omarchy.tasks WHERE task_id=$1',['pilot006'])
    assert.deepEqual(stored.rows[0],{state:'completed',attempts:1})
    const audit=await pool.query('SELECT previous_hash,event_hash,kind,metadata_json FROM neo_omarchy.audit_events ORDER BY seq ASC')
    assert.ok(audit.rows.length>=5)
    for(let i=1;i<audit.rows.length;i++){
      assert.equal(audit.rows[i].previous_hash,audit.rows[i-1].event_hash)
    }
    const text=JSON.stringify(audit.rows)
    assert.equal(text.includes('synthetic only'),false)
    assert.equal(text.includes('BEGIN PRIVATE KEY'),false)
    await controller.revokeApprovedMachine({
      machineId,operatorEnvelope:approval('machine.revoke',machineId),
    })
    await assert.rejects(transport.pollLease(),/machine_not_authorized/)
  } finally {await pool.end()}
})
