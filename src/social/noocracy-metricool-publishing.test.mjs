import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareNoocracyMetricoolPost, scheduleNoocracyMetricoolPost } from './noocracy-metricool-publishing.mjs'
import { createMemorySocialAutomationStore } from '../../server/neo-router/social-automation-store.mjs'
import { getLanePolicy, DEFAULT_PROVIDER_ORDER } from './neo-social-campaign-pipeline.mjs'

const now = '2026-11-25T21:00:00Z'
const clock = () => now
function input(network = 'linkedin') {
  const video = network === 'tiktok'
  return {
    now, network, caption: 'SYNTHETIC TEST: Daily Noocracy Report. Subscribe on LinkedIn: https://www.linkedin.com/newsletters/synthetic-test-fixture',
    publicationAt: '2026-11-26T11:00:00-06:00',
    source: { kind: 'daily_noocracy_report', id: 'synthetic-report', version: 'fixture-v1', sha256: 'a'.repeat(64), verified: true, sourceAligned: true, verifiedAt: now, editionDate: '2026-11-26' },
    subscription: { kind: 'linkedin_newsletter', url: 'https://www.linkedin.com/newsletters/synthetic-test-fixture', verified: true, verifiedAt: now },
    media: { url: `https://example.org/fixture.${video ? 'mp4' : 'png'}`, format: video ? 'video' : 'image', mimeType: video ? 'video/mp4' : 'image/png', width: video ? 1080 : 1920, height: video ? 1920 : 1080, bytes: 1000000, durationSeconds: 30, altText: 'Synthetic Noocracy card', publiclyAccessible: true, nonExpiring: true, verifiedAt: now, isAiGenerated: true },
    connection: { brandId: '7080510', network, accountId: `synthetic-${network}`, connected: true, verifiedAt: now, creatorOptionsVerified: true, creatorOptionsVerifiedAt: now, privacyOptions: ['PUBLIC_TO_EVERYONE'], privacyOption: 'PUBLIC_TO_EVERYONE', maxVideoPostDurationSec: 600, commentDisabled: true },
    snapshot: { brandId: '7080510', timezone: 'America/Chicago', capturedAt: now, fromDate: '2026-11-26T00:00:00-06:00', toDate: '2026-11-26T23:59:59-06:00', complete: true, posts: [] },
  }
}
function harness(value = input(), { onCreate } = {}) {
  let posts = structuredClone(value.snapshot.posts)
  let creates = 0
  let reads = 0
  const store = createMemorySocialAutomationStore()
  const runtime = {
    clock, store,
    async readSnapshot() { reads++; return { ...structuredClone(value.snapshot), posts: structuredClone(posts) } },
    async createScheduledPost(request) {
      creates++
      assert.deepEqual(Object.keys(request).sort(), ['blogId', 'date', 'info'])
      const parsed = JSON.parse(request.info)
      const post = { ...parsed, id: 12345, uuid: 'synthetic-new-post', providers: parsed.providers.map(provider => ({ ...provider, status: 'PENDING' })) }
      if (onCreate) await onCreate({ post, posts, request })
      else posts.push(post)
      return { id: post.id, uuid: post.uuid }
    },
  }
  return { runtime, get creates() { return creates }, get reads() { return reads }, get posts() { return posts }, set posts(value) { posts = value } }
}
test('prepares real connector arguments and leaves original campaign routes unchanged', () => {
  const plan = prepareNoocracyMetricoolPost(input())
  const info = JSON.parse(plan.request.info)
  assert.equal(plan.idempotencyKey, 'noocracy_report:metricool:7080510:2026-11-26:linkedin')
  assert.equal(plan.request.blogId, '7080510')
  assert.deepEqual(info.providers, [{ network: 'linkedin' }])
  assert.deepEqual(info.media, ['https://example.org/fixture.png'])
  assert.equal(info.autoPublish, true)
  assert.equal(info.draft, false)
  assert.equal(info.saveExternalMediaFiles, true)
  assert.equal(info.publicationDate.dateTime, '2026-11-26T11:00:00')
  assert.equal(getLanePolicy('noocracy_report').worldBulletin, false)
  assert.equal(getLanePolicy('noocracy_report').socialDestinations.includes('tiktok'), false)
  assert.deepEqual(DEFAULT_PROVIDER_ORDER.linkedin, ['windsor_organic', 'direct_platform_api'])
})
test('video-only TikTok uses actual media/privacy fields and preserves AI classification', () => {
  const info = JSON.parse(prepareNoocracyMetricoolPost(input('tiktok')).request.info)
  assert.equal(info.tiktokData.privacyOption, 'PUBLIC_TO_EVERYONE')
  assert.equal(info.tiktokData.isAigc, true)
  assert.equal(info.tiktokData.disableComment, true)
  assert.equal('type' in info.tiktokData, false)
  assert.deepEqual(info.media, ['https://example.org/fixture.mp4'])
})
for (const [name, mutate, message] of [
  ['missing report', value => { value.source = null }, /verified_daily_noocracy_report_required/],
  ['historical Papers substitution', value => { value.source.kind = 'noocracy_papers' }, /verified_daily_noocracy_report_required/],
  ['missing verified subscription', value => { value.subscription.verified = false }, /verified_subscription_url_required/],
  ['wrong subscription domain', value => { value.subscription.url = 'https://example.org/newsletters/123' }, /linkedin_newsletter_destination_required/],
  ['profile instead of newsletter', value => { value.subscription.url = 'https://www.linkedin.com/in/synthetic' }, /linkedin_newsletter_destination_required/],
  ['wrong LinkedIn CTA', value => { value.caption = value.caption.replace('Subscribe on LinkedIn:', 'Subscribe:') }, /exact_linkedin_subscription_cta_suffix_required/],
  ['content after LinkedIn CTA', value => { value.caption += ' #Noocracy' }, /exact_linkedin_subscription_cta_suffix_required/],
  ['wrong brand', value => { value.connection.brandId = 'other' }, /verified_metricool_connection_required/],
  ['unverified media', value => { value.media.publiclyAccessible = false }, /verified_public_nonexpiring_media_required/],
  ['private media address', value => { value.media.url = 'https://127.0.0.1/asset.png' }, /media_url_must_be_public_https/],
  ['wrong card ratio', value => { value.media.width = 1080 }, /campaign_media_aspect_ratio_mismatch/],
  ['incomplete snapshot', value => { value.snapshot.complete = false }, /complete_schedule_snapshot_required/],
  ['partial-day snapshot', value => { value.snapshot.fromDate = '2026-11-26T09:00:00-06:00' }, /full_edition_day_snapshot_required/],
  ['stale source', value => { value.source.verifiedAt = '2026-11-23T21:00:00Z' }, /source_verification_stale/],
  ['missing AI classification', value => { delete value.media.isAiGenerated }, /media_ai_classification_required/],
  ['source date mismatch', value => { value.source.editionDate = '2026-11-25' }, /source_edition_date_mismatch/],
]) test(`blocks ${name} before any connector operation`, () => {
  const value = input(); mutate(value)
  assert.throws(() => prepareNoocracyMetricoolPost(value), message)
})
for (const [name, mutate, message] of [
  ['image fallback', value => { value.media.format = 'image' }, /media_format_mismatch/],
  ['unsupported video MIME', value => { value.media.mimeType = 'video/webm' }, /tiktok_video_must_be_mp4_or_mov/],
  ['unverified creator options', value => { value.connection.creatorOptionsVerified = false }, /verified_tiktok_privacy_option_required/],
  ['account duration limit', value => { value.connection.maxVideoPostDurationSec = 15 }, /tiktok_account_duration_limit/],
  ['oversized video', value => { value.media.bytes = 501 * 1024 * 1024 }, /tiktok_video_constraints_failed/],
  ['multiline caption', value => { value.caption += '\nSecond line' }, /tiktok_caption_must_be_single_line/],
]) test(`blocks TikTok ${name}`, () => {
  const value = input('tiktok'); mutate(value)
  assert.throws(() => prepareNoocracyMetricoolPost(value), message)
})
test('existing post within one-hour spacing is preserved and blocks scheduling', () => {
  const value = input()
  value.snapshot.posts.push({ id: 7, uuid: 'existing', text: 'Unrelated campaign', providers: [{ network: 'linkedin', status: 'PENDING' }], publicationDate: { dateTime: '2026-11-26T10:30:00', timezone: 'America/Chicago' } })
  const original = structuredClone(value.snapshot)
  assert.throws(() => prepareNoocracyMetricoolPost(value), /schedule_collision/)
  assert.deepEqual(value.snapshot, original)
})
test('earlier same-day Noocracy edition is not duplicated', () => {
  const value = input()
  value.snapshot.posts.push({ id: 7, text: 'Daily Noocracy Report — morning', providers: [{ network: 'linkedin' }], publicationDate: { dateTime: '2026-11-26T07:00:00', timezone: 'America/Chicago' } })
  assert.throws(() => prepareNoocracyMetricoolPost(value), /noocracy_edition_already_scheduled/)
})
test('spacing uses real elapsed time across the spring DST transition', () => {
  const value = input()
  value.now = '2027-03-13T21:00:00Z'
  for (const field of ['source', 'subscription', 'media', 'connection']) value[field].verifiedAt = value.now
  value.publicationAt = '2027-03-14T03:00:00-05:00'
  value.source.editionDate = '2027-03-14'
  Object.assign(value.snapshot, { capturedAt: value.now, fromDate: '2027-03-14T00:00:00-06:00', toDate: '2027-03-14T23:59:59-05:00', posts: [{ id: 7, text: 'Other campaign', providers: [{ network: 'linkedin' }], publicationDate: { dateTime: '2027-03-14T01:30:00', timezone: 'America/Chicago' } }] })
  assert.throws(() => prepareNoocracyMetricoolPost(value), /schedule_collision/)
})
test('successful readback yields scheduled, never published; replay makes no second create', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  const first = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(first.status, 'scheduled'); assert.equal(first.published, false); assert.equal(first.platformPostId, null)
  assert.equal(first.metricoolPostId, '12345'); assert.equal(first.existingPostsPreserved, true)
  const replay = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(replay.replayed, true); assert.equal(h.creates, 1)
})
test('concurrent daily claims permit only one create', async () => {
  const value = input(); const plans = [prepareNoocracyMetricoolPost(value), prepareNoocracyMetricoolPost(value)]; const h = harness(value)
  const results = await Promise.all(plans.map(plan => scheduleNoocracyMetricoolPost(plan, h.runtime)))
  assert.equal(h.creates, 1)
  assert.equal(results.filter(result => result.status === 'scheduled').length, 1)
  assert.equal(results.filter(result => result.reason === 'existing_or_concurrent_claim').length, 1)
})
test('changing source revision and caption does not reset the daily edition limit', async () => {
  const value = input(); const firstPlan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  const revised = structuredClone(value)
  revised.source.version = 'fixture-v2'
  revised.source.sha256 = 'b'.repeat(64)
  revised.caption = revised.caption.replace('SYNTHETIC TEST:', 'REVISED SYNTHETIC TEST:')
  const revisedPlan = prepareNoocracyMetricoolPost(revised)
  assert.equal(firstPlan.idempotencyKey, revisedPlan.idempotencyKey)
  await scheduleNoocracyMetricoolPost(firstPlan, h.runtime)
  const second = await scheduleNoocracyMetricoolPost(revisedPlan, h.runtime)
  assert.equal(second.replayed, true); assert.equal(h.creates, 1)
})
test('ambiguous create is reconciled from readback without a second create', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value)
  const h = harness(value, { onCreate: ({ post, posts }) => { posts.push(post); throw new Error('timeout') } })
  const result = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(result.status, 'scheduled'); assert.equal(result.recoveredFromAmbiguousCreate, true); assert.equal(h.creates, 1)
})
test('ambiguous failure without readback evidence never retries automatically', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value)
  const h = harness(value, { onCreate: () => { throw new Error('timeout with unknown outcome') } })
  const result = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(result.status, 'reconciliation_required'); assert.equal(result.automaticRetryAllowed, false)
  await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(h.creates, 1)
})
test('queue changes after preparation block create', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  h.posts = [{ id: 88, text: 'New unrelated post' }]
  await assert.rejects(scheduleNoocracyMetricoolPost(plan, h.runtime), /schedule_changed_since_preparation/)
  assert.equal(h.creates, 0)
})
test('missing media or AI flag in readback does not count as verified', async () => {
  for (const field of ['media', 'ai']) {
    const value = input('tiktok'); const plan = prepareNoocracyMetricoolPost(value)
    const h = harness(value, { onCreate: ({ post, posts }) => { if (field === 'media') post.media = []; else delete post.tiktokData.isAigc; posts.push(post) } })
    const result = await scheduleNoocracyMetricoolPost(plan, h.runtime)
    assert.equal(result.status, 'reconciliation_required'); assert.equal(h.creates, 1)
  }
})
test('rewritten media URL requires reconciliation until byte identity is verified', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value)
  const h = harness(value, { onCreate: ({ post, posts }) => { post.media = ['https://example.org/metricool-copied.png']; posts.push(post) } })
  assert.equal((await scheduleNoocracyMetricoolPost(plan, h.runtime)).status, 'reconciliation_required')
})
test('changed existing content after create is detected without repair/update', async () => {
  const value = input()
  value.snapshot.posts.push({ id: 7, uuid: 'existing', text: 'Preserve me', providers: [{ network: 'linkedin', status: 'PENDING' }], publicationDate: { dateTime: '2026-11-26T15:00:00', timezone: 'America/Chicago' } })
  const plan = prepareNoocracyMetricoolPost(value)
  const h = harness(value, { onCreate: ({ post, posts }) => { posts[0].text = 'Changed elsewhere'; posts.push(post) } })
  const result = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(result.status, 'reconciliation_required'); assert.equal(result.reason, 'existing_schedule_changed')
})
test('forged, serialized, or tampered plans cannot execute', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  await assert.rejects(scheduleNoocracyMetricoolPost(structuredClone(plan), h.runtime), /unaltered_in_process_validated_plan_required/)
  plan.request.blogId = 'another-brand'
  await assert.rejects(scheduleNoocracyMetricoolPost(plan, h.runtime), /unaltered_in_process_validated_plan_required/)
  assert.equal(h.creates, 0)
})
test('stale prepared plans cannot execute', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  h.runtime.clock = () => '2026-11-25T21:06:00Z'
  await assert.rejects(scheduleNoocracyMetricoolPost(plan, h.runtime), /plan_verification_stale/)
  assert.equal(h.creates, 0)
})
test('private execution snapshot prevents mutation during an awaited preflight', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value)
  const h = harness(value, { onCreate: ({ post, posts, request }) => { assert.equal(request.blogId, '7080510'); posts.push(post) } })
  const read = h.runtime.readSnapshot
  h.runtime.readSnapshot = async (...args) => { plan.request.blogId = 'injected-other-brand'; return read(...args) }
  assert.equal((await scheduleNoocracyMetricoolPost(plan, h.runtime)).status, 'scheduled')
  assert.equal(h.creates, 1)
})
test('slow preflight cannot create after the publication window has elapsed', async () => {
  const value = input(); const plan = prepareNoocracyMetricoolPost(value); const h = harness(value)
  let time = now
  h.runtime.clock = () => time
  const claim = h.runtime.store.claim
  h.runtime.store.claim = async (...args) => { const claimed = await claim(...args); time = '2026-11-26T17:00:01Z'; return claimed }
  const result = await scheduleNoocracyMetricoolPost(plan, h.runtime)
  assert.equal(result.status, 'blocked'); assert.equal(h.creates, 0)
})
