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
