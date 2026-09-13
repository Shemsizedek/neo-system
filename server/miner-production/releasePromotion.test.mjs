import test from 'node:test'
import assert from 'node:assert/strict'
import {attestationCheck,buildProductionAttestation} from './productionAttestation.mjs'
import {buildReleaseAttestation,signReleaseAttestation,verifyReleaseAttestation} from './releasePromotion.mjs'

const ids=['EDGE_HTTPS','OPERATOR_HEALTH','PRIVATE_BACKEND_READY','ANONYMOUS_SESSION_BLOCKED','AUTHENTICATED_SESSION','SESSION_COOKIE_POLICY','CSRF_ENFORCED','RBAC_PROVEN','TREASURY_READ','HASHVAULT_READ','SESSION_LOGOUT']
const green=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'release-bot',operatorRole:'ADMIN',generatedAt:'2026-08-29T15:00:00.000Z'})
const commit='a'.repeat(40)
const image='sha256:'+'b'.repeat(64)
const secret='test-only-signing-secret'

test('signed GREEN attestation authorizes only its bound release identity',()=>{
  const payload=buildReleaseAttestation({attestation:green,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'})
  const signed=signReleaseAttestation(payload,secret)
  const verified=verifyReleaseAttestation(signed,{secret,expectedCommitSha:commit,expectedImageDigest:image,now:Date.parse('2026-08-29T15:02:00.000Z')})
  assert.equal(verified.commitSha,commit)
  assert.equal(verified.imageDigest,image)
})

test('stale attestation cannot promote a newer commit',()=>{
  const signed=signReleaseAttestation(buildReleaseAttestation({attestation:green,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),secret)
  assert.throws(()=>verifyReleaseAttestation(signed,{secret,expectedCommitSha:'c'.repeat(40),expectedImageDigest:image,now:Date.parse('2026-08-29T15:02:00.000Z')}),/COMMIT_MISMATCH/)
})

test('tampering invalidates signature',()=>{
  const signed=signReleaseAttestation(buildReleaseAttestation({attestation:green,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),secret)
  signed.imageDigest='sha256:'+'d'.repeat(64)
  assert.throws(()=>verifyReleaseAttestation(signed,{secret,now:Date.parse('2026-08-29T15:02:00.000Z')}),/SIGNATURE_INVALID/)
})

test('old signed attestation expires fail closed',()=>{
  const signed=signReleaseAttestation(buildReleaseAttestation({attestation:green,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),secret)
  assert.throws(()=>verifyReleaseAttestation(signed,{secret,maxAgeMs:60_000,now:Date.parse('2026-08-29T15:03:00.000Z')}),/STALE/)
})

test('blocked production attestation cannot be signed for promotion',()=>{
  const blocked=buildProductionAttestation({checks:[attestationCheck('EDGE_HTTPS',false)]})
  assert.throws(()=>buildReleaseAttestation({attestation:blocked,commitSha:commit,imageDigest:image}),/PRODUCTION_ATTESTATION_BLOCKED/)
})

test('minimal forged attestation is rejected during release promotion',()=>{
  const forged={schema:'neo-miner-production-attestation/v1',state:'GREEN'}
  assert.throws(()=>buildReleaseAttestation({attestation:forged,commitSha:commit,imageDigest:image}),/ATTESTATION_GENERATED_AT_REQUIRED/)
})

test('attestation without operator is rejected during release promotion',()=>{
  const incomplete={schema:'neo-miner-production-attestation/v1',state:'GREEN',generatedAt:'2026-08-29T15:00:00.000Z',source:'FORGED',summary:{required:11,green:11,blocked:0},checks:ids.map(id=>attestationCheck(id,true))}
  assert.throws(()=>buildReleaseAttestation({attestation:incomplete,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),/ATTESTATION_OPERATOR_REQUIRED/)
})

test('stale production attestation is rejected during release promotion',()=>{
  const stale=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'release-bot',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  assert.throws(()=>buildReleaseAttestation({attestation:stale,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:00:00.000Z',maxAttestationAgeMs:30*60*1000}),/ATTESTATION_STALE_OR_FUTURE/)
})

test('pentest exploit: release promotion with minimal forged attestation is blocked',()=>{
  // This is the core exploit: attacker supplies {schema, state: GREEN} as production attestation
  const forged={schema:'neo-miner-production-attestation/v1',state:'GREEN'}
  assert.throws(()=>buildReleaseAttestation({attestation:forged,commitSha:commit,imageDigest:image}),/ATTESTATION_GENERATED_AT_REQUIRED/)
})

test('pentest exploit: release promotion with forged attestation missing checks is blocked',()=>{
  // Attacker tries to bypass with more fields but still incomplete
  const forged={
    schema:'neo-miner-production-attestation/v1',
    state:'GREEN',
    generatedAt:'2026-08-29T15:00:00.000Z',
    source:'ATTACKER_ARTIFACT',
    operator:{id:'attacker',role:'WRITER'},
    summary:{required:11,green:11,blocked:0}
    // Missing checks array
  }
  assert.throws(()=>buildReleaseAttestation({attestation:forged,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),/ATTESTATION_CHECKS_INCOMPLETE/)
})

test('pentest exploit: release promotion with forged attestation with incomplete checks is blocked',()=>{
  // Attacker provides some checks but not all required ones
  const forged={
    schema:'neo-miner-production-attestation/v1',
    state:'GREEN',
    generatedAt:'2026-08-29T15:00:00.000Z',
    source:'ATTACKER_ARTIFACT',
    operator:{id:'attacker',role:'WRITER'},
    summary:{required:11,green:11,blocked:0},
    checks:[
      attestationCheck('EDGE_HTTPS',true),
      attestationCheck('OPERATOR_HEALTH',true)
    ]
  }
  assert.throws(()=>buildReleaseAttestation({attestation:forged,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),/ATTESTATION_CHECKS_INCOMPLETE/)
})

test('pentest exploit: release promotion prevents replay of old legitimate attestation',()=>{
  // Attacker reuses a legitimate but old GREEN attestation from a different run
  const oldLegitimate=buildProductionAttestation({
    checks:ids.map(id=>attestationCheck(id,true)),
    operatorId:'legitimate-operator',
    operatorRole:'ADMIN',
    generatedAt:'2026-08-29T13:00:00.000Z' // 2 hours old
  })
  // Attacker tries to use it to promote a different commit
  assert.throws(()=>buildReleaseAttestation({
    attestation:oldLegitimate,
    commitSha:commit,
    imageDigest:image,
    generatedAt:'2026-08-29T15:00:00.000Z',
    maxAttestationAgeMs:30*60*1000 // 30 minutes max age
  }),/ATTESTATION_STALE_OR_FUTURE/)
})

test('pentest exploit: release promotion with forged attestation with wrong check states is blocked',()=>{
  // Attacker provides all checks but some are BLOCKED, claims GREEN anyway
  const checksWithBlocked=ids.map((id,i)=>attestationCheck(id,i!==5)) // One check is BLOCKED
  const forged={
    schema:'neo-miner-production-attestation/v1',
    state:'GREEN', // Lies
    generatedAt:'2026-08-29T15:00:00.000Z',
    source:'ATTACKER_ARTIFACT',
    operator:{id:'attacker',role:'WRITER'},
    summary:{required:11,green:11,blocked:0}, // Lies
    checks:checksWithBlocked
  }
  assert.throws(()=>buildReleaseAttestation({attestation:forged,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),/ATTESTATION_REQUIRED_CHECK_NOT_GREEN/)
})

test('pentest exploit: signed release cannot be used with different commit than attested',()=>{
  // Even if attacker gets a valid signed release, they can't use it for a different commit
  const validAttestation=buildProductionAttestation({
    checks:ids.map(id=>attestationCheck(id,true)),
    operatorId:'release-bot',
    operatorRole:'ADMIN',
    generatedAt:'2026-08-29T15:00:00.000Z'
  })
  const originalCommit='a'.repeat(40)
  const attackerCommit='c'.repeat(40)
  const payload=buildReleaseAttestation({
    attestation:validAttestation,
    commitSha:originalCommit,
    imageDigest:image,
    generatedAt:'2026-08-29T15:01:00.000Z'
  })
  const signed=signReleaseAttestation(payload,secret)
  
  // Attacker tries to verify with different commit
  assert.throws(()=>verifyReleaseAttestation(signed,{
    secret,
    expectedCommitSha:attackerCommit,
    expectedImageDigest:image,
    now:Date.parse('2026-08-29T15:02:00.000Z')
  }),/COMMIT_MISMATCH/)
})

test('pentest exploit: signed release cannot be used with different image than attested',()=>{
  // Even if attacker gets a valid signed release, they can't use it for a different image
  const validAttestation=buildProductionAttestation({
    checks:ids.map(id=>attestationCheck(id,true)),
    operatorId:'release-bot',
    operatorRole:'ADMIN',
    generatedAt:'2026-08-29T15:00:00.000Z'
  })
  const originalImage='sha256:'+'b'.repeat(64)
  const attackerImage='sha256:'+'d'.repeat(64)
  const payload=buildReleaseAttestation({
    attestation:validAttestation,
    commitSha:commit,
    imageDigest:originalImage,
    generatedAt:'2026-08-29T15:01:00.000Z'
  })
  const signed=signReleaseAttestation(payload,secret)
  
  // Attacker tries to verify with different image
  assert.throws(()=>verifyReleaseAttestation(signed,{
    secret,
    expectedCommitSha:commit,
    expectedImageDigest:attackerImage,
    now:Date.parse('2026-08-29T15:02:00.000Z')
  }),/IMAGE_MISMATCH/)
})

test('pentest mitigation: legitimate fresh attestation with all checks passes release promotion',()=>{
  // Verify that legitimate attestations still work after mitigation
  const legitimate=buildProductionAttestation({
    checks:ids.map(id=>attestationCheck(id,true)),
    operatorId:'release-bot',
    operatorRole:'ADMIN',
    generatedAt:'2026-08-29T15:00:00.000Z'
  })
  const payload=buildReleaseAttestation({
    attestation:legitimate,
    commitSha:commit,
    imageDigest:image,
    generatedAt:'2026-08-29T15:01:00.000Z',
    maxAttestationAgeMs:30*60*1000
  })
  assert.equal(payload.commitSha,commit)
  assert.equal(payload.imageDigest,image)
  assert.equal(payload.productionAttestation.state,'GREEN')
})

