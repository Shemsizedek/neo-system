import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createInstitutionalIdentity, registerSigningKey, signAttestation, rotateSigningKey } from '../neo-router/identity-trust.mjs'
import { appendGovernanceLedger, verifyGovernanceLedger } from '../neo-router/institutional-governance.mjs'
import { createAccordProposal, createAccordVotePayload, evaluateAccord, accordDigest, accordGovernanceRecord } from './accords.mjs'

const createdAt = '2026-11-11T18:00:00.000Z'
const expiresAt = '2026-12-11T18:00:00.000Z'
const termsDigest = 'a'.repeat(64)
function setup() {
  const proposal = createAccordProposal({ id: 'acc-001', proposer: 'node-a', parties: ['node-b', 'node-a'], purpose: 'coordinate non-binding replica health reports', termsDigest, createdAt, expiresAt })
  const trustedIdentities = {}, trustedKeys = {}, privateKeys = {}
  for (const id of proposal.parties) {
    const kp = crypto.generateKeyPairSync('ed25519')
    trustedIdentities[id] = createInstitutionalIdentity({ id, trustDomain: 'neo-system' })
    trustedKeys[id + '-key'] = registerSigningKey({ identityId: id, keyId: id + '-key', publicKey: kp.publicKey })
    privateKeys[id] = kp.privateKey
  }
  function vote(party, decision = 'accept', proposalForVote = proposal, nonce = party + '-1') {
    return { attestation: signAttestation({ identityId: party, keyId: party + '-key', privateKey: privateKeys[party], issuedAt: createdAt, payload: createAccordVotePayload({ proposal: proposalForVote, decision, nonce }) }) }
  }
  return { proposal, trustedIdentities, trustedKeys, privateKeys, vote }
}
const evaluate = (x, receipts) => evaluateAccord({ proposal: x.proposal, receipts, trustedIdentities: x.trustedIdentities, trustedKeys: x.trustedKeys, now: '2026-11-12T00:00:00.000Z' })

test('two independent signed receipts approve coordination review, never execution', () => {
  const x = setup()
  const pending = evaluate(x, [x.vote('node-a')])
  assert.equal(pending.status, 'pending')
  const approved = evaluate(x, [x.vote('node-a'), x.vote('node-b')])
  assert.equal(approved.status, 'accepted-for-review')
  assert.equal(approved.executionAuthorized, false)
  assert.equal(approved.legallyBinding, false)
  const ledger = appendGovernanceLedger({ record: accordGovernanceRecord({ proposal: x.proposal, evaluation: approved, recordedAt: createdAt }) })
  assert.equal(verifyGovernanceLedger(ledger).valid, true)
  assert.equal(ledger[0].record.matter.termsDigest, termsDigest)
})

test('rejects tampered signatures, changed agreements, duplicates and unknown members', () => {
  const x = setup()
  const bad = x.vote('node-a')
  bad.attestation.payload.decision = 'reject'
  assert.deepEqual(evaluate(x, [bad]).reasons, ['unverified-signature'])
  assert.equal(evaluate(x, [x.vote('node-a'), x.vote('node-a')]).status, 'blocked')
  const changed = { ...x.proposal, purpose: 'new purpose' }
  assert.equal(evaluateAccord({ proposal: changed, receipts: [x.vote('node-a')], trustedIdentities: x.trustedIdentities, trustedKeys: x.trustedKeys, now: createdAt }).status, 'blocked')
  const unknown = { attestation: { identityId: 'node-c', keyId: 'x', payload: {} } }
  assert.equal(evaluate(x, [unknown]).status, 'blocked')
})

test('rejection, expiry and revoked keys fail closed', () => {
  const x = setup()
  assert.equal(evaluate(x, [x.vote('node-a', 'reject'), x.vote('node-b')]).status, 'rejected')
  assert.equal(evaluateAccord({ proposal: x.proposal, receipts: [x.vote('node-a'), x.vote('node-b')], trustedIdentities: x.trustedIdentities, trustedKeys: x.trustedKeys, now: expiresAt }).status, 'blocked')
  const next = crypto.generateKeyPairSync('ed25519')
  x.trustedKeys['node-a-key'] = rotateSigningKey({ key: x.trustedKeys['node-a-key'], newKeyId: 'node-a-next', newPublicKey: next.publicKey }).revoked
  assert.equal(evaluate(x, [x.vote('node-a'), x.vote('node-b')]).status, 'blocked')
})

test('proposal validation, canonical hash and secret-free handoff', () => {
  const x = setup()
  assert.equal(accordDigest(x.proposal), accordDigest({ ...x.proposal, parties: [...x.proposal.parties] }))
  assert.throws(() => createAccordProposal({ ...x.proposal, parties: ['node-a', 'node-a'] }), /distinct/)
  assert.throws(() => createAccordProposal({ ...x.proposal, termsDigest: 'plaintext terms' }), /SHA-256/)
  assert.throws(() => createAccordVotePayload({ proposal: x.proposal, decision: 'execute', nonce: 'x' }), /decision/)
  assert.equal(x.proposal.executionEnabled, false)
  assert.equal(evaluateAccord({ proposal: { protocol: 'NEO-ACCORDS/1', id: 'fake', parties: [], expiresAt }, now: createdAt }).status, 'blocked')
  assert.equal(evaluateAccord({ proposal: { ...x.proposal, executionEnabled: true }, now: createdAt }).status, 'blocked')
})
