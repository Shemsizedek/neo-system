import crypto from 'node:crypto'
import { verifyAttestation } from '../neo-router/identity-trust.mjs'
import { createDecisionRecord } from '../neo-router/institutional-governance.mjs'

const PROTOCOL = 'NEO-ACCORDS/1'
const SHA256 = /^[0-9a-f]{64}$/
const text = value => typeof value === 'string' && value.trim().length > 0
const clone = value => structuredClone(value)
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value

export function accordDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

/** Gate 1 creates a proposal, not a binding contract or an executable delegation. */
export function createAccordProposal({ id, proposer, parties, purpose, termsDigest, trustDomain = 'neo-system', expiresAt, createdAt = new Date().toISOString() } = {}) {
  if (![id, proposer, purpose, trustDomain].every(text)) throw new TypeError('id, proposer, purpose and trustDomain required')
  if (!SHA256.test(termsDigest ?? '')) throw new TypeError('termsDigest must be a lowercase SHA-256 digest')
  if (!Array.isArray(parties) || parties.length < 2 || !parties.every(text) || new Set(parties).size !== parties.length) {
    throw new TypeError('at least two distinct party identity IDs required')
  }
  if (!parties.includes(proposer)) throw new TypeError('proposer must be a party')
  if (!text(expiresAt) || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.parse(createdAt)) {
    throw new TypeError('future expiresAt required')
  }
  if (!Number.isFinite(Date.parse(createdAt))) throw new TypeError('valid createdAt required')
  return Object.freeze({
    protocol: PROTOCOL,
    id,
    proposer,
    parties: Object.freeze([...parties].sort()),
    purpose,
    termsDigest,
    trustDomain,
    createdAt,
    expiresAt,
    category: 'internal-coordination',
    legalEffect: 'none-by-software',
    executionEnabled: false
  })
}

function validProposal(proposal) {
  if (!proposal || proposal.protocol !== PROTOCOL) return false
  try {
    const expected = createAccordProposal(proposal)
    return JSON.stringify(canonical(proposal)) === JSON.stringify(canonical(expected))
  } catch { return false }
}

/** Parties sign this exact payload through identity-trust.signAttestation. */
export function createAccordVotePayload({ proposal, decision, nonce } = {}) {
  if (!validProposal(proposal) || !['accept', 'reject'].includes(decision) || !text(nonce)) {
    throw new TypeError('valid proposal, decision and unique nonce required')
  }
  return { protocol: PROTOCOL, accordId: proposal.id, accordDigest: accordDigest(proposal), decision, nonce }
}

/**
 * Each receipt: {attestation, identity, key}. Identity and signing key must be
 * supplied from a trusted, up-to-date registry, never from the untrusted receipt.
 * Fail closed on any invalid/unknown/replayed vote. No side effects or broadcasts.
 */
export function evaluateAccord({ proposal, receipts = [], trustedIdentities = {}, trustedKeys = {}, now = new Date() } = {}) {
  if (!validProposal(proposal)) return { status: 'blocked', reasons: ['invalid-proposal'], executionAuthorized: false }
  const reasons = []
  const nowMs = +new Date(now)
  if (!Number.isFinite(nowMs)) reasons.push('invalid-clock')
  if (nowMs >= Date.parse(proposal.expiresAt)) reasons.push('expired')
  const expectedDigest = accordDigest(proposal)
  const parties = new Set(proposal.parties)
  const voters = new Set()
  const nonces = new Set()
  const votes = []

  for (const receipt of receipts) {
    const attestation = receipt?.attestation
    const identityId = attestation?.identityId
    const keyId = attestation?.keyId
    const payload = attestation?.payload
    if (!parties.has(identityId)) { reasons.push('unknown-party'); continue }
    if (voters.has(identityId)) { reasons.push('duplicate-party-vote'); continue }
    voters.add(identityId)
    if (!text(payload?.nonce) || nonces.has(payload.nonce)) { reasons.push('duplicate-or-missing-nonce'); continue }
    nonces.add(payload.nonce)
    if (payload.protocol !== PROTOCOL || payload.accordId !== proposal.id || payload.accordDigest !== expectedDigest || !['accept', 'reject'].includes(payload.decision)) {
      reasons.push('invalid-vote-payload'); continue
    }
    const identity = trustedIdentities[identityId]
    const key = trustedKeys[keyId]
    let verification
    try { verification = verifyAttestation({ attestation, identity, key, expectedTrustDomain: proposal.trustDomain }) }
    catch { verification = { valid: false } }
    if (!verification.valid || key?.identityId !== identityId) { reasons.push('unverified-signature'); continue }
    votes.push({ party: identityId, decision: payload.decision, keyId })
  }
  const rejected = votes.some(v => v.decision === 'reject')
  const allAccepted = proposal.parties.every(id => votes.some(v => v.party === id && v.decision === 'accept'))
  const status = reasons.length ? 'blocked' : rejected ? 'rejected' : allAccepted ? 'accepted-for-review' : 'pending'
  return { accordId: proposal.id, accordDigest: expectedDigest, status, reasons: [...new Set(reasons)], partyCount: proposal.parties.length, verifiedVoteCount: votes.length, votes: clone(votes), executionAuthorized: false, legallyBinding: false }
}

/** Optional safe bridge to NEO Router's existing hash-linked governance ledger. */
export function accordGovernanceRecord({ proposal, evaluation, recordedAt = new Date().toISOString() } = {}) {
  if (!validProposal(proposal) || !evaluation || proposal.id !== evaluation.accordId || accordDigest(proposal) !== evaluation.accordDigest) {
    throw new TypeError('proposal and evaluation mismatch')
  }
  return createDecisionRecord({
    id: 'accord:' + proposal.id,
    matter: { id: proposal.id, purpose: proposal.purpose, termsDigest: proposal.termsDigest, proposalDigest: evaluation.accordDigest },
    authority: { trustDomain: proposal.trustDomain, class: 'internal-coordination', legalEffect: 'none-by-software' },
    outcome: evaluation.status,
    evidence: evaluation.votes.map(v => ({ party: v.party, keyId: v.keyId, decision: v.decision })),
    resultingMissions: [],
    recordedAt
  })
}
