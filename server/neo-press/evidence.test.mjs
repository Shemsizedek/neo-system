import test from 'node:test'
import assert from 'node:assert/strict'
import { sha256, makeEvidenceMetadata, validateEvidenceMetadata, publicEvidencePreview, credentialPublicSummary } from './evidence.mjs'

const bytes = 'Original investigation media bytes'
const base = {
  id: 'NEO-PRESS-TEST-001', caseId: 'NEO-PRESS-DEMO', title: 'Test evidence item',
  custodianId: 'reviewer-test', sourceLocator: 'original source label',
  sourceUrl: 'https://example.org/record',
  acquiredAt: '2026-11-02T12:00:00Z', observedAt: '2026-11-02T11:00:00Z',
  sourceTier: 'LEAD', editorialState: 'UNRESOLVED', accessLevel: 'RESTRICTED',
  sourceKind: 'SOCIAL_MEDIA', sha256: sha256(bytes)
}
test('intake hashes original data and creates initial custody event', () => {
  const item = makeEvidenceMetadata(base, bytes)
  assert.equal(item.custodyEvents[0].digest, sha256(bytes))
  assert.equal(Object.isFrozen(item), true)
  assert.throws(() => makeEvidenceMetadata(base, 'changed'), /hash mismatch/)
})
test('social media requires documented corroboration to advance', () => {
  assert.ok(validateEvidenceMetadata({ ...base, sourceTier: 'PRIMARY' }).some(e => e.includes('social media')))
  assert.deepEqual(validateEvidenceMetadata({ ...base, sourceTier: 'PRIMARY', corroborationNote: 'Authentication documented in separate restricted evidence record' }), [])
})
test('invalid timestamps, non-HTTPS URL and hash are rejected', () => {
  assert.ok(validateEvidenceMetadata({ ...base, acquiredAt: 'tomorrow', sourceUrl: 'http://unsafe', sha256: 'none' }).length >= 3)
})
test('confidential evidence cannot be published and approval is mandatory', () => {
  const approval = { decision: 'APPROVED', editorId: 'editor-test', privacyChecked: true, legalRiskChecked: true, accuracyChecked: true }
  assert.throws(() => publicEvidencePreview(base, approval), /restricted/)
  assert.throws(() => publicEvidencePreview({ ...base, accessLevel: 'PUBLIC' }, { ...approval, accuracyChecked: false }), /approval/)
  const summary = publicEvidencePreview({ ...base, accessLevel: 'PUBLIC', sourceNotes: 'SECRET', identity: 'PRIVATE' }, approval)
  assert.equal(summary.identity, undefined)
  assert.equal(summary.sourceNotes, undefined)
  assert.equal(summary.title, base.title)
})
test('historical credential never grants special governmental authority', () => {
  const c = credentialPublicSummary({ state: 'USER_PROVIDED_UNVERIFIED', fullName: 'PRIVATE', image: 'PRIVATE' })
  assert.equal(c.currentlyVerified, false)
  assert.equal(c.grantsSpecialGovernmentAuthority, false)
  assert.equal(c.fullName, undefined)
  assert.equal(c.image, undefined)
})
