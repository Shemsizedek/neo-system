import test from 'node:test'
import assert from 'node:assert/strict'
import {runtimeIdentityFromEnv,evaluateRuntimeDrift,buildRuntimeAttestation,verifyRuntimeAttestation,isFinancialMutation} from './runtimeIdentity.mjs'

const commit='a'.repeat(40)
const digest='sha256:'+'b'.repeat(64)
const secret='runtime-test-secret'

test('matching baked and authorized identities are GREEN',()=>{
  const identity=runtimeIdentityFromEnv({NEO_BUILD_COMMIT_SHA:commit,NEO_RUNTIME_IMAGE_DIGEST:digest,NEO_AUTHORIZED_COMMIT_SHA:commit,NEO_AUTHORIZED_IMAGE_DIGEST:digest})
  assert.deepEqual(evaluateRuntimeDrift(identity),{state:'GREEN',holdFinancialMutations:false,reasons:[]})
  const att=buildRuntimeAttestation({identity,generatedAt:'2026-08-29T16:00:00.000Z',secret})
  assert.equal(verifyRuntimeAttestation(att,{secret,expectedCommitSha:commit,expectedImageDigest:digest}).drift.state,'GREEN')
})

test('commit drift fails closed',()=>{
  const identity=runtimeIdentityFromEnv({NEO_BUILD_COMMIT_SHA:commit,NEO_RUNTIME_IMAGE_DIGEST:digest,NEO_AUTHORIZED_COMMIT_SHA:'c'.repeat(40),NEO_AUTHORIZED_IMAGE_DIGEST:digest})
  const drift=evaluateRuntimeDrift(identity)
  assert.equal(drift.state,'DRIFT')
  assert.equal(drift.holdFinancialMutations,true)
  assert.ok(drift.reasons.includes('COMMIT_DRIFT'))
})

test('missing runtime image digest fails closed',()=>{
  const identity=runtimeIdentityFromEnv({NEO_BUILD_COMMIT_SHA:commit,NEO_AUTHORIZED_COMMIT_SHA:commit,NEO_AUTHORIZED_IMAGE_DIGEST:digest})
  assert.ok(evaluateRuntimeDrift(identity).reasons.includes('RUNTIME_IMAGE_DIGEST_MISSING_OR_INVALID'))
})

test('attestation without signing secret remains held',()=>{
  const identity=runtimeIdentityFromEnv({NEO_BUILD_COMMIT_SHA:commit,NEO_RUNTIME_IMAGE_DIGEST:digest,NEO_AUTHORIZED_COMMIT_SHA:commit,NEO_AUTHORIZED_IMAGE_DIGEST:digest})
  const att=buildRuntimeAttestation({identity,secret:''})
  assert.equal(att.drift.state,'DRIFT')
  assert.ok(att.drift.reasons.includes('ATTESTATION_SECRET_MISSING'))
})

test('financial mutation classifier covers payout and settlement writes',()=>{
  assert.equal(isFinancialMutation('POST','/payouts/abc/broadcast-core'),true)
  assert.equal(isFinancialMutation('POST','/hashvault/credits'),true)
  assert.equal(isFinancialMutation('POST','/hashvault/payouts/reconcile'),true)
  assert.equal(isFinancialMutation('POST','/incidents/INC-1/resolve'),true)
  assert.equal(isFinancialMutation('GET','/treasury'),false)
  assert.equal(isFinancialMutation('POST','/session/logout'),false)
})
