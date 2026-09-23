import assert from 'node:assert/strict'
import test from 'node:test'
import { buildNomniSocialPayload, buildPlatformJobs } from './nomni-social-payload.mjs'

const base = {
  title: 'NOMNI: Bitcoin-Native Monetary Architecture',
  caption: 'NOMNI uses Bitcoin settlement with Counterparty asset semantics. Issuer-defined treasury doctrine is labeled separately.',
  altText: '16:9 NOMNI architecture card showing Bitcoin, Counterparty and NOMNI layers.',
  imageUrl: 'https://example.org/nomni-card.png',
  sourceDocument: 'NOMNI Technical Paper',
  sourceVersion: '0.1',
  claims: [
    { text: 'Counterparty anchors asset activity to Bitcoin transactions.', classification: 'externally-verifiable', source: 'Counterparty documentation' },
    { text: 'NOMNI is defined by its issuer as a treasury settlement instrument.', classification: 'issuer-defined' },
  ],
}

test('builds the fixed NOMNI lane payload', () => {
  const payload = buildNomniSocialPayload(base)
  assert.equal(payload.contentLane, 'nomni_ausarian')
  assert.equal(payload.media.aspectRatio, '16:9')
  assert.equal(payload.worldBulletin, false)
  assert.deepEqual(payload.destinations, ['facebook', 'linkedin', 'youtube_community'])
  assert.equal(payload.approval.required, true)
})

test('rejects World Bulletin as a NOMNI social destination', () => {
  assert.throws(
    () => buildNomniSocialPayload({ ...base, destinations: ['world_bulletin'] }),
    /destination_not_allowed/
  )
})

test('requires claim provenance classification', () => {
  assert.throws(
    () => buildNomniSocialPayload({ ...base, claims: [{ text: 'Unclassified claim' }] }),
    /claim_classification_invalid/
  )
})

test('creates one idempotent publication job per social destination', () => {
  const jobs = buildPlatformJobs(buildNomniSocialPayload(base))
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].receipt.required, true)
  assert.ok(jobs.every((job) => job.idempotencyKey.includes('0.1')))
})
