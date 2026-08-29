import test from 'node:test'
import assert from 'node:assert/strict'
import {attestationCheck,buildProductionAttestation} from './productionAttestation.mjs'
import {buildReleaseAttestation,signReleaseAttestation} from './releasePromotion.mjs'
import {buildDeploymentRecord,signDeploymentRecord,verifyDeploymentRecord,authorizeRollback} from './deploymentProvenance.mjs'

const ids=['EDGE_HTTPS','OPERATOR_HEALTH','PRIVATE_BACKEND_READY','ANONYMOUS_SESSION_BLOCKED','AUTHENTICATED_SESSION','SESSION_COOKIE_POLICY','CSRF_ENFORCED','RBAC_PROVEN','TREASURY_READ','HASHVAULT_READ','SESSION_LOGOUT']
const production=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops',operatorRole:'ADMIN',generatedAt:'2026-08-29T15:00:00.000Z'})
const releaseSecret='release-test-secret'
const provenanceSecret='provenance-test-secret'
const c1='1'.repeat(40),c2='2'.repeat(40)
const i1='sha256:'+'a'.repeat(64),i2='sha256:'+'b'.repeat(64)
const release=(commit,image)=>signReleaseAttestation(buildReleaseAttestation({attestation:production,commitSha:commit,imageDigest:image,generatedAt:'2026-08-29T15:01:00.000Z'}),releaseSecret)

test('deployment record binds signed release to observed runtime identity',()=>{
  const r=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c1,i1),releaseSecret,observedCommitSha:c1,observedImageDigest:i1,deployedAt:'2026-08-29T15:02:00.000Z'}),provenanceSecret)
  const v=verifyDeploymentRecord(r,{secret:provenanceSecret})
  assert.equal(v.observed.commitSha,c1)
  assert.equal(v.observed.imageDigest,i1)
})

test('runtime identity mismatch is rejected',()=>{
  assert.throws(()=>buildDeploymentRecord({releaseAttestation:release(c1,i1),releaseSecret,observedCommitSha:c2,observedImageDigest:i1}),/COMMIT_MISMATCH/)
})

test('hash chain detects missing or reordered deployment history',()=>{
  const first=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c1,i1),releaseSecret,observedCommitSha:c1,observedImageDigest:i1}),provenanceSecret)
  const second=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c2,i2),releaseSecret,observedCommitSha:c2,observedImageDigest:i2,previousRecord:first}),provenanceSecret)
  assert.throws(()=>verifyDeploymentRecord(second,{secret:provenanceSecret,previousRecord:null}),/CHAIN_INVALID/)
  assert.doesNotThrow(()=>verifyDeploymentRecord(second,{secret:provenanceSecret,previousRecord:first}))
})

test('rollback only authorizes a previously deployed signed identity',()=>{
  const first=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c1,i1),releaseSecret,observedCommitSha:c1,observedImageDigest:i1}),provenanceSecret)
  const second=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c2,i2),releaseSecret,observedCommitSha:c2,observedImageDigest:i2,previousRecord:first}),provenanceSecret)
  const auth=authorizeRollback({targetCommitSha:c1,targetImageDigest:i1,history:[first,second],provenanceSecret,currentCommitSha:c2,currentImageDigest:i2})
  assert.equal(auth.authorized,true)
  assert.throws(()=>authorizeRollback({targetCommitSha:'3'.repeat(40),targetImageDigest:'sha256:'+'c'.repeat(64),history:[first,second],provenanceSecret}),/NOT_PREVIOUSLY_DEPLOYED/)
})

test('tampering with a historical record invalidates rollback authorization',()=>{
  const first=signDeploymentRecord(buildDeploymentRecord({releaseAttestation:release(c1,i1),releaseSecret,observedCommitSha:c1,observedImageDigest:i1}),provenanceSecret)
  first.observed.imageDigest='sha256:'+'f'.repeat(64)
  assert.throws(()=>authorizeRollback({targetCommitSha:c1,targetImageDigest:i1,history:[first],provenanceSecret}),/SIGNATURE_INVALID/)
})
