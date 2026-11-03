import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync,sign } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createCanonicalAuditLedger, verifyAuditV2Rows, canonicalAuditRecord,
  createWitnessRequest,verifyExternalWitness,witnessBytes } from './canonical-ledger-008.mjs'
import { createMissionCertification } from './mission-certification-008.mjs'

const P='0'.repeat(64)
const TEST_DB=process.env.NEO_OMARCHY_PG_TEST_URL
const machine='neo:machine:omarchy-gate008-lab'

test('canonical event ordering independent of source object key order',()=>{
  const a=canonicalAuditRecord({sequence:1,eventType:'task.completed',
    subjectId:machine,occurredAtMs:1_800_000_000_000,previousHash:P,
    metadata:{outcome:'completed',taskId:'task008',resultSha256:'a'.repeat(64)}})
  const b=canonicalAuditRecord({sequence:1,eventType:'task.completed',
    subjectId:machine,occurredAtMs:1_800_000_000_000,previousHash:P,
    metadata:{resultSha256:'a'.repeat(64),taskId:'task008',outcome:'completed'}})
  assert.equal(a,b)
  assert.match(a,/NEO-OMARCHY-AUDIT-V2/)
  assert.throws(()=>canonicalAuditRecord({sequence:1,eventType:'task.completed',
    subjectId:machine,occurredAtMs:1_800_000_000_000,previousHash:P,
    metadata:{secret:'not-allowed'}}),/metadata_field_rejected/)
})

test('external witness requires pinned signer and matching hash',()=>{
  const keys=generateKeyPairSync('ed25519')
  const snap={verified:true,eventCount:2,headHash:'a'.repeat(64),
    snapshotSha256:'b'.repeat(64)}
  const request=createWitnessRequest({verifiedSnapshot:snap,contextId:'neo:mission:pilot008'})
  const payload={schema:'NEO-OMARCHY-WITNESS-ATTESTATION-008',
    witnessId:'neo:witness:outside-operator',contextId:request.contextId,
    headHash:request.headHash,snapshotSha256:request.snapshotSha256,
    eventCount:request.eventCount,signedAt:1_800_000_000_000}
  const attestation={payload,signature:sign(null,witnessBytes(payload),keys.privateKey).toString('base64url')}
  const pem=keys.publicKey.export({format:'pem',type:'spki'})
  assert.equal(verifyExternalWitness({request,attestation,publicKeyPem:pem,
    expectedWitnessId:'neo:witness:outside-operator'}),true)
  assert.equal(verifyExternalWitness({request,attestation,publicKeyPem:pem,
    expectedWitnessId:'neo:witness:wrong'}),false)
  assert.equal(verifyExternalWitness({request,attestation:{
    ...attestation,payload:{...payload,headHash:'c'.repeat(64)}},
    publicKeyPem:pem,expectedWitnessId:'neo:witness:outside-operator'}),false)
  assert.equal(request.independentlyWitnessed,false)
})

test('operational mission approval fails closed without real source attestation',()=>{
  const none=createMissionCertification()
  assert.equal(none.promotable,false)
  assert.ok(none.missing.includes('liveNEOpassIssuer'))
  assert.ok(none.missing.includes('liveOllamaInference'))
  const fake=createMissionCertification({
    liveNEOpassIssuer:true,hardwareOwned:true,actualDeviceAttested:true,
    realMtlSConnection:true,realDatabaseRestored:true,liveOllamaInference:true,
    independentWitnessReviewed:true,operatorApproved:true,
    financialCapabilitiesDisabled:true,stagingHostApproved:true,
  })
  // Independent fields supplied by a caller are evidence INPUTS, not cryptographic
  // proof. This function cannot label production readiness from booleans.
  assert.equal(fake.promotable,false)
  assert.equal(fake.productionReady,false)
})

test('real disposable PostgreSQL v2 append, full rehash and immutable history',{
  skip:!TEST_DB,timeout:120_000,
},async()=>{
  const url=new URL(TEST_DB)
  assert.equal(url.hostname,'127.0.0.1')
  assert.equal(url.pathname,'/neo_omarchy_ci')
  const {Pool}=await import('pg')
  const pool=new Pool({connectionString:url.href,max:4,ssl:false})
  try{
    const name=await pool.query('SELECT current_database() AS db')
    assert.equal(name.rows[0].db,'neo_omarchy_ci')
    await pool.query((await readFile(new URL('./postgres-008.sql',import.meta.url),'utf8')))
    const ledger=createCanonicalAuditLedger({pool,now:()=>1_800_000_000_000})
    const results=await Promise.all([
      ledger.append({eventType:'machine.attested',subjectId:machine,
        metadata:{scope:'local-inference',machineId:machine}}),
      ledger.append({eventType:'task.completed',subjectId:machine,
        metadata:{taskId:'task008',outcome:'completed',resultSha256:'c'.repeat(64)}}),
    ])
    assert.deepEqual(results.map(r=>r.sequence).sort(),[1,2])
    const verified=await ledger.verify()
    assert.equal(verified.verified,true)
    assert.equal(verified.eventCount,2)
    assert.equal(verified.originalAuditV1Migrated,false)
    const snapshot=await ledger.exportSnapshot()
    assert.equal(snapshot.headHash,verified.headHash)
    const rows=await pool.query('SELECT sequence,event_type,subject_id,metadata_json,occurred_at_ms,previous_hash,event_hash,canonical_record FROM neo_omarchy.audit_v2 ORDER BY sequence')
    const scrambled=structuredClone(rows.rows)
    scrambled[0].metadata_json={...scrambled[0].metadata_json,scope:'admin'}
    assert.throws(()=>verifyAuditV2Rows(scrambled),/audit_hash_verification_failed/)
    const forged=structuredClone(rows.rows)
    forged[1].event_hash='f'.repeat(64)
    assert.throws(()=>verifyAuditV2Rows(forged),/audit_hash_verification_failed/)
    await assert.rejects(pool.query("UPDATE neo_omarchy.audit_v2 SET event_type='tampered' WHERE sequence=1"),
      /neo_omarchy_audit_v2_append_only/)
    await assert.rejects(pool.query('DELETE FROM neo_omarchy.audit_v2 WHERE sequence=1'),
      /neo_omarchy_audit_v2_append_only/)
    const after=await ledger.verify()
    assert.equal(after.headHash,verified.headHash)
    assert.equal(after.eventCount,2)
  }finally{await pool.end()}
})
