import { createHash } from 'node:crypto'
import policy from '../../registry/noocracy-metricool-gate-002.json' with { type: 'json' }

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const preparedPlans = new WeakMap()
const required = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_required`)
  return value.trim()
}
const instant = (value, name) => {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${name}_must_include_timezone`)
  return Date.parse(value)
}
const localDateTime = value => {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: policy.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(value))
  const get = type => parts.find(part => part.type === type).value
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`
}
function zonedInstants(dateTime) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTime ?? '')) throw new Error('existing_schedule_time_unverified')
  const approximate = Date.parse(dateTime + 'Z')
  const formatter = new Intl.DateTimeFormat('en', { timeZone: policy.timezone, timeZoneName: 'longOffset' })
  const offsets = new Set([-36, 0, 36].map(hours => formatter.formatToParts(new Date(approximate + hours * 3600000)).find(part => part.type === 'timeZoneName').value.replace('GMT', '') || 'Z'))
  const candidates = [...offsets].map(offset => Date.parse(dateTime + offset)).filter(value => Number.isFinite(value) && localDateTime(value) === dateTime)
  if (!candidates.length) throw new Error('existing_schedule_time_unverified')
  return candidates
}
const httpsUrl = (value, name) => {
  let url
  try { url = new URL(required(value, name)) } catch { throw new Error(`${name}_must_be_public_https`) }
  if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost' || !url.hostname.includes('.') || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || url.hostname.includes(':')) throw new Error(`${name}_must_be_public_https`)
  return url.href
}
const fresh = (verifiedAt, now, name, maxAgeMs = 24 * 60 * 60 * 1000) => {
  const age = instant(now, 'now') - instant(verifiedAt, `${name}_verifiedAt`)
  if (age < 0 || age > maxAgeMs) throw new Error(`${name}_verification_stale`)
}
const identity = post => required(String(post.uuid ?? post.id ?? ''), 'scheduled_post_identity')
const networks = post => (post.providers ?? []).map(provider => provider.network).sort()
const signature = post => hash({
  text: post.text, providers: networks(post), publicationDate: post.publicationDate,
  media: post.media ?? [], mediaAltText: post.mediaAltText ?? [], autoPublish: post.autoPublish, draft: post.draft,
  linkedinData: networks(post).includes('linkedin') ? { type: post.linkedinData?.type, previewIncluded: post.linkedinData?.previewIncluded } : null,
  tiktokData: networks(post).includes('tiktok') ? {
    privacyOption: post.tiktokData?.privacyOption,
    isAigc: post.tiktokData?.isAigc ?? false, autoAddMusic: post.tiktokData?.autoAddMusic ?? false,
    disableComment: post.tiktokData?.disableComment ?? false, disableDuet: post.tiktokData?.disableDuet ?? false, disableStitch: post.tiktokData?.disableStitch ?? false,
  } : null,
})
const samePosts = (left, right) => {
  const byId = new Map(right.map(post => [identity(post), post]))
  return left.length === right.length && byId.size === right.length && left.every(post => byId.has(identity(post)) && hash(post) === hash(byId.get(identity(post))))
}

function validateSnapshot(snapshot, publicationAt, now) {
  if (!snapshot || snapshot.complete !== true || !Array.isArray(snapshot.posts)) throw new Error('complete_schedule_snapshot_required')
  if (snapshot.brandId !== policy.metricoolBrandId || snapshot.timezone !== policy.timezone) throw new Error('schedule_scope_mismatch')
  fresh(snapshot.capturedAt, now, 'schedule', 5 * 60 * 1000)
  const target = instant(publicationAt, 'publicationAt')
  if (instant(snapshot.fromDate, 'snapshot_fromDate') > target - policy.minimumSpacingMinutes * 60000 || instant(snapshot.toDate, 'snapshot_toDate') < target + policy.minimumSpacingMinutes * 60000) throw new Error('schedule_snapshot_range_incomplete')
  const day = localDateTime(publicationAt).slice(0, 10)
  if (localDateTime(snapshot.fromDate) > `${day}T00:00:00` || localDateTime(snapshot.toDate) < `${day}T23:59:59`) throw new Error('full_edition_day_snapshot_required')
  const ids = snapshot.posts.map(identity)
  if (new Set(ids).size !== ids.length) throw new Error('schedule_snapshot_duplicate_identity')
}

/** Pure preparation. Verification fields are attestations from the trusted orchestrator,
 * not user-generated reports. This function does not fetch URLs or call a provider. */
export function prepareNoocracyMetricoolPost({ source, subscription, media, connection, network, caption, publicationAt, snapshot, now }) {
  if (!policy.destinations.includes(network)) throw new Error('destination_not_authorized')
  if (instant(publicationAt, 'publicationAt') <= instant(now, 'now')) throw new Error('publication_must_be_future')
  if (!source || source.kind !== 'daily_noocracy_report' || source.verified !== true || source.sourceAligned !== true) throw new Error('verified_daily_noocracy_report_required')
  required(source.id, 'source_id'); required(source.version, 'source_version')
  if (!/^[a-f0-9]{64}$/.test(source.sha256 ?? '')) throw new Error('source_sha256_required')
  fresh(source.verifiedAt, now, 'source')
  const editionDate = localDateTime(publicationAt).slice(0, 10)
  if (source.editionDate !== editionDate) throw new Error('source_edition_date_mismatch')
  if (subscription?.verified !== true || subscription?.kind !== 'linkedin_newsletter') throw new Error('verified_subscription_url_required')
  const subscriptionUrl = httpsUrl(subscription.url, 'subscription_url')
  const subscriptionDestination = new URL(subscriptionUrl)
  if (!['linkedin.com', 'www.linkedin.com'].includes(subscriptionDestination.hostname) || !/^\/newsletters\/[^/]+/.test(subscriptionDestination.pathname)) throw new Error('linkedin_newsletter_destination_required')
  fresh(subscription.verifiedAt, now, 'subscription')
  caption = required(caption, 'caption')
  if (!caption.includes(subscriptionUrl)) throw new Error('subscription_cta_missing')
  if (network === 'linkedin' && !caption.endsWith(`Subscribe on LinkedIn: ${subscriptionUrl}`)) throw new Error('exact_linkedin_subscription_cta_suffix_required')
  if (network === 'tiktok' && /[\r\n]/.test(caption)) throw new Error('tiktok_caption_must_be_single_line')
  if (!connection || connection.brandId !== policy.metricoolBrandId || connection.network !== network || connection.connected !== true) throw new Error('verified_metricool_connection_required')
  required(connection.accountId, 'connection_account_id')
  fresh(connection.verifiedAt, now, 'connection')
  if (!media || media.publiclyAccessible !== true || media.nonExpiring !== true) throw new Error('verified_public_nonexpiring_media_required')
  const mediaUrl = httpsUrl(media.url, 'media_url')
  fresh(media.verifiedAt, now, 'media')
  if (!(media.bytes > 0)) throw new Error('verified_media_bytes_required')
  if (typeof media.isAiGenerated !== 'boolean') throw new Error('media_ai_classification_required')
  const isVideo = network === 'tiktok'
  if (media.format !== policy.formats[network] || !(isVideo ? /^video\// : /^image\//).test(media.mimeType ?? '')) throw new Error('media_format_mismatch')
  if (isVideo && !['video/mp4', 'video/quicktime'].includes(media.mimeType)) throw new Error('tiktok_video_must_be_mp4_or_mov')
  const ratio = isVideo ? 9 / 16 : 16 / 9
  if (!(media.width > 0 && media.height > 0) || Math.abs(media.width / media.height - ratio) > 0.005) throw new Error('campaign_media_aspect_ratio_mismatch')
  if (isVideo && (media.bytes > 500 * 1024 * 1024 || !(media.durationSeconds >= 3 && media.durationSeconds <= 600) || Math.min(media.width, media.height) < 540)) throw new Error('tiktok_video_constraints_failed')
  validateSnapshot(snapshot, publicationAt, now)
  const info = {
    text: caption,
    providers: [{ network }],
    publicationDate: { dateTime: localDateTime(publicationAt), timezone: policy.timezone },
    media: [mediaUrl],
    autoPublish: true,
    saveExternalMediaFiles: true,
    draft: false,
  }
  if (isVideo) {
    if (connection.creatorOptionsVerified !== true || !Array.isArray(connection.privacyOptions) || !connection.privacyOptions.includes(connection.privacyOption)) throw new Error('verified_tiktok_privacy_option_required')
    fresh(connection.creatorOptionsVerifiedAt, now, 'tiktok_creator_options')
    if (!(connection.maxVideoPostDurationSec > 0) || media.durationSeconds > connection.maxVideoPostDurationSec) throw new Error('tiktok_account_duration_limit_unverified_or_exceeded')
    info.tiktokData = { privacyOption: required(connection.privacyOption, 'tiktok_privacy_option'), isAigc: media.isAiGenerated, autoAddMusic: false }
    for (const [capability, field] of [['commentDisabled', 'disableComment'], ['duetDisabled', 'disableDuet'], ['stitchDisabled', 'disableStitch']]) {
      if (connection[capability] === true) info.tiktokData[field] = true
    }
  } else {
    info.mediaAltText = [required(media.altText, 'image_alt_text')]
    info.linkedinData = { type: 'POST', previewIncluded: false }
  }
  const expectedSignature = signature(info)
  for (const post of snapshot.posts) {
    if (signature(post) === expectedSignature) throw new Error('post_already_scheduled')
    if (!networks(post).includes(network)) continue
    if (!post.publicationDate?.dateTime || post.publicationDate.timezone !== policy.timezone) throw new Error('existing_schedule_time_unverified')
    const planned = instant(publicationAt, 'publicationAt')
    if (zonedInstants(post.publicationDate.dateTime).some(existing => Math.abs(planned - existing) < policy.minimumSpacingMinutes * 60000)) throw new Error('schedule_collision')
    if (post.publicationDate.dateTime.slice(0, 10) === editionDate && /\b(?:daily\s+)?noocracy\s+report\b/i.test(post.text ?? '')) throw new Error('noocracy_edition_already_scheduled')
  }
  const plan = {
    schema: 'neo.noocracy.metricool-plan.v1',
    preparedAt: now,
    gate: policy.gate, network, editionDate, sourceId: source.id, sourceVersion: source.version, sourceSha256: source.sha256,
    idempotencyKey: `${policy.contentLane}:metricool:${policy.metricoolBrandId}:${editionDate}:${network}`,
    accountId: connection.accountId,
    request: { blogId: policy.metricoolBrandId, date: publicationAt, info: JSON.stringify(info) },
    readRequest: { brandId: policy.metricoolBrandId, fromDate: snapshot.fromDate, toDate: snapshot.toDate, timezone: policy.timezone, extendedRange: false },
    expectedSignature,
    baseline: structuredClone(snapshot.posts),
  }
  preparedPlans.set(plan, hash(plan))
  return plan
}

/** Only calls the injected create operation once. The existing social store interface
 * supplies atomic claims + durable receipts. A production store must be durable. */
export async function scheduleNoocracyMetricoolPost(plan, { createScheduledPost, readSnapshot, store, clock = () => new Date().toISOString() }) {
  if (plan?.schema !== 'neo.noocracy.metricool-plan.v1' || plan.gate !== policy.gate || preparedPlans.get(plan) !== hash(plan)) throw new Error('unaltered_in_process_validated_plan_required')
  plan = structuredClone(plan)
  if (typeof createScheduledPost !== 'function' || typeof readSnapshot !== 'function' || !['claim', 'getReceipt', 'saveReceipt'].every(name => typeof store?.[name] === 'function')) throw new Error('connector_and_receipt_store_required')
  const existing = await store.getReceipt(plan.idempotencyKey, plan.network)
  if (existing) return { ...existing, replayed: true }
  fresh(plan.preparedAt, clock(), 'plan', 5 * 60 * 1000)
  if (instant(plan.request.date, 'publicationAt') <= instant(clock(), 'now')) throw new Error('publication_must_be_future')
  const before = await readSnapshot(structuredClone(plan.readRequest))
  validateSnapshot(before, plan.request.date, clock())
  if (!samePosts(plan.baseline, before.posts)) throw new Error('schedule_changed_since_preparation')
  if (!await store.claim(plan.idempotencyKey, plan.network)) return { status: 'reconciliation_required', reason: 'existing_or_concurrent_claim', published: false, replayed: true }
  const createTime = instant(clock(), 'now')
  if (instant(plan.request.date, 'publicationAt') <= createTime || createTime - instant(plan.preparedAt, 'preparedAt') > 5 * 60 * 1000) {
    const receipt = { status: 'blocked', reason: 'publication_window_elapsed_or_plan_expired', published: false, platformPostId: null, automaticRetryAllowed: false, idempotencyKey: plan.idempotencyKey, network: plan.network }
    await store.saveReceipt(plan.idempotencyKey, plan.network, receipt)
    return receipt
  }
  let createError = false
  try { await createScheduledPost(structuredClone(plan.request)) } catch { createError = true }
  let receipt
  try {
    const after = await readSnapshot(structuredClone(plan.readRequest))
    if (after?.complete !== true || !Array.isArray(after.posts) || after.brandId !== policy.metricoolBrandId || after.timezone !== policy.timezone) throw new Error('complete_readback_required')
    validateSnapshot(after, plan.request.date, clock())
    const byId = new Map(after.posts.map(post => [identity(post), post]))
    const preserved = plan.baseline.every(post => byId.has(identity(post)) && hash(post) === hash(byId.get(identity(post))))
    if (!preserved) throw new Error('existing_schedule_changed')
    const matches = after.posts.filter(post => signature(post) === plan.expectedSignature)
    if (matches.length !== 1) throw new Error(matches.length ? 'ambiguous_readback' : 'scheduled_post_not_verified')
    const post = matches[0]
    if (post.providers.some(provider => provider.status !== 'PENDING')) throw new Error('provider_pending_status_not_verified')
    receipt = {
      status: 'scheduled', published: false, platformPostId: null,
      metricoolPostId: required(String(post.id ?? ''), 'metricool_post_id'),
      metricoolUuid: required(String(post.uuid ?? ''), 'metricool_uuid'),
      verification: 'complete_schedule_readback', existingPostsPreserved: true,
      recoveredFromAmbiguousCreate: createError,
    }
  } catch (error) {
    receipt = { status: 'reconciliation_required', published: false, platformPostId: null, reason: error.message, automaticRetryAllowed: false }
  }
  receipt = { ...receipt, gate: policy.gate, idempotencyKey: plan.idempotencyKey, network: plan.network, accountId: plan.accountId, sourceSha256: plan.sourceSha256, replayed: false }
  await store.saveReceipt(plan.idempotencyKey, plan.network, receipt)
  return receipt
}
