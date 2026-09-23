import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOmnitrixSocialPayload, buildOmnitrixPlatformJobs } from './omnitrix-social-payload.mjs'

const captions = Object.fromEntries(['facebook','linkedin','x','tiktok','instagram','youtube_community'].map((d) => [d, `Omnitrix caption for ${d}`]))
const base = {
  headline: 'The Great Affordability Glitch',
  episodeDate: '2026-09-23',
  topicSummary: 'A sourced comic treatment of current affordability pressures.',
  panels: [{ id: 1, text: 'Omnitrix alert.' }],
  finalCaption: 'Current economic conditions, translated into the Omnitrix universe.',
  sources: [{ title: 'Primary economic release', url: 'https://example.org/release', publishedAt: '2026-09-23' }],
  imageUrl: 'https://example.org/omnitrix.png',
  altText: 'Comic panel showing the Omnitrix team reviewing an affordability dashboard.',
  captions,
}

test('builds Omnitrix payload with accessibility and provenance', () => {
  const p = buildOmnitrixSocialPayload(base)
  assert.equal(p.episodeDate, '2026-09-23')
  assert.equal(p.media.altText, base.altText)
  assert.equal(p.provenance.refreshAtPublishTime, true)
  assert.equal(p.worldBulletin, false)
})

test('fails closed when kill switch is not enabled', () => {
  const p = buildOmnitrixSocialPayload(base)
  assert.throws(() => buildOmnitrixPlatformJobs(p, { env: {} }), /kill_switch_closed/)
})

test('creates six jobs when explicitly enabled', () => {
  const jobs = buildOmnitrixPlatformJobs(buildOmnitrixSocialPayload(base), { env: { NEO_SOCIAL_OMNITRIX_ENABLED: 'true' } })
  assert.equal(jobs.length, 6)
  assert.ok(jobs.every((j) => j.receipt.persistBeforeSuccess))
  assert.ok(jobs.every((j) => j.auditDestination.endsWith('.ndjson')))
})

test('rejects missing alt text and unsupported destinations', () => {
  assert.throws(() => buildOmnitrixSocialPayload({ ...base, altText: '' }), /altText_required/)
  assert.throws(() => buildOmnitrixSocialPayload({ ...base, destinations: ['world_bulletin'] }), /destination_not_allowed/)
})
