import { dispatchSocialJob } from './neo-social-dispatcher.mjs'

const LANE_POLICIES = Object.freeze({
  noocracy_papers: { socialDestinations: ['facebook','linkedin','youtube_community'], worldBulletin: true },
  noocracy_report: { socialDestinations: ['facebook','linkedin','youtube_community'], worldBulletin: false },
  nomni_ausarian: { socialDestinations: ['facebook','linkedin','youtube_community'], worldBulletin: false },
  omnitrix_chronicles: { socialDestinations: ['facebook','linkedin','x','tiktok','instagram','youtube_community'], worldBulletin: false },
})

const DEFAULT_PROVIDER_ORDER = Object.freeze({
  facebook: ['windsor_organic','direct_platform_api'],
  linkedin: ['windsor_organic','direct_platform_api'],
  x: ['windsor_organic'],
  tiktok: ['direct_platform_api'],
  instagram: ['windsor_organic'],
  youtube_community: ['youtube_community_ui'],
})

function required(name, value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name}_required`)
  return value.trim()
}

function deriveSourceVersion(payload) {
  return payload?.provenance?.sourceVersion ?? payload?.sourceVersion ?? payload?.episodeDate ?? payload?.version ?? null
}

function captionFor(payload, destination) {
  return payload?.captions?.[destination] ?? payload?.caption ?? payload?.finalCaption ?? null
}

export function getLanePolicy(contentLane) {
  const policy = LANE_POLICIES[contentLane]
  if (!policy) throw new Error(`unknown_content_lane:${contentLane}`)
  return policy
}

export function normalizeCampaignPayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('payload_required')
  const contentLane = required('contentLane', payload.contentLane)
  const policy = getLanePolicy(contentLane)
  const contentId = required('contentId', payload.contentId)
  const sourceVersion = required('sourceVersion', String(deriveSourceVersion(payload) ?? ''))
  const imageUrl = required('imageUrl', payload?.media?.imageUrl ?? payload.imageUrl)
  const altText = required('altText', payload?.media?.altText ?? payload.altText)
  if (!/^https:\/\//i.test(imageUrl)) throw new Error('image_url_must_be_https')
  if (payload.worldBulletin !== policy.worldBulletin) throw new Error(`world_bulletin_policy_mismatch:${contentLane}`)
  if (payload?.approval?.required === true && payload?.approval?.class !== 'B-with-fixed-template') throw new Error('unsupported_approval_class')

  const destinations = [...new Set(payload.destinations ?? [])]
  if (!destinations.length) throw new Error('destinations_required')
  for (const destination of destinations) {
    if (!policy.socialDestinations.includes(destination)) throw new Error(`destination_not_allowed:${contentLane}:${destination}`)
    required(`caption:${destination}`, captionFor(payload, destination))
  }

  return {
    schema: 'neo.social.campaign-normalized.v0.1',
    contentLane, contentId, sourceVersion,
    title: payload.title ?? payload.headline ?? null,
    media: { imageUrl, altText },
    destinations,
    worldBulletin: policy.worldBulletin,
    approval: payload.approval ?? {required:true,class:'B-with-fixed-template'},
    provenance: payload.provenance ?? null,
    sourcePayloadSchema: payload.schema ?? null,
    sourcePayload: payload,
  }
}

export function buildCommonPlatformJobs(payload, {env = process.env} = {}) {
  const normalized = normalizeCampaignPayload(payload)
  if (normalized.contentLane === 'omnitrix_chronicles' && env.NEO_SOCIAL_OMNITRIX_ENABLED !== 'true') throw new Error('omnitrix_kill_switch_closed')

  return normalized.destinations.map((destination) => ({
    schema: 'neo.social.common-job.v0.1',
    destination,
    contentLane: normalized.contentLane,
    contentId: normalized.contentId,
    sourceVersion: normalized.sourceVersion,
    title: normalized.title,
    imageUrl: normalized.media.imageUrl,
    altText: normalized.media.altText,
    caption: captionFor(normalized.sourcePayload, destination),
    idempotencyKey: `${normalized.contentLane}:${normalized.sourceVersion}:${destination}`,
    provenance: normalized.provenance,
    approval: normalized.approval,
    receipt: { required: true, fields: ['provider','destination','account_id','published_at','platform_post_id','status'] },
  }))
}

export async function dispatchCampaignPayload(payload, runtime, {
  approvalGranted = false,
  providerOrder = DEFAULT_PROVIDER_ORDER,
  env = process.env,
} = {}) {
  if (payload?.approval?.required !== false && approvalGranted !== true) throw new Error('publication_approval_required')
  const jobs = buildCommonPlatformJobs(payload,{env})
  const receipts = []
  for (const job of jobs) {
    const receipt = await dispatchSocialJob(job, runtime, {providerOrder})
    receipts.push({...receipt, contentLane:job.contentLane, idempotencyKey:job.idempotencyKey})
  }
  return {
    schema: 'neo.social.campaign-dispatch.v0.1',
    contentLane: payload.contentLane,
    contentId: payload.contentId,
    sourceVersion: deriveSourceVersion(payload),
    worldBulletin: payload.worldBulletin,
    receipts,
  }
}

export { LANE_POLICIES, DEFAULT_PROVIDER_ORDER }
