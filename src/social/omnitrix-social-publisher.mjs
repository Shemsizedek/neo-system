import { publishNomniSocialJob } from './nomni-social-publisher.mjs'
import { queryCreatorInfo, publishPhoto, fetchPublishStatus } from './tiktok-client.mjs'

const CONTROLLED_DESTINATIONS = new Set(['facebook', 'linkedin', 'tiktok'])
const ISOLATED_DESTINATIONS = new Set(['x', 'instagram'])

function privacyOptions(info = {}) {
  const data = info?.data ?? info
  return data?.privacy_level_options ?? data?.privacyLevelOptions ?? []
}

export async function publishOmnitrixSocialJob(job, credentials = {}, options = {}) {
  if (!job?.destination) throw new Error('destination_required')

  if (ISOLATED_DESTINATIONS.has(job.destination)) {
    return { destination: job.destination, contentId: job.contentId, status: 'isolated', published: false, reason: 'provider_not_enabled_for_omnitrix_022' }
  }

  if (job.destination === 'youtube_community') return publishNomniSocialJob(job, credentials, options)
  if (!CONTROLLED_DESTINATIONS.has(job.destination)) throw new Error(`unsupported_destination:${job.destination}`)

  if (job.destination === 'tiktok') {
    const token = credentials.accessToken ?? process.env.TIKTOK_ACCESS_TOKEN
    if (!token) throw new Error('tiktok_access_token_required')
    const creator = await queryCreatorInfo(token)
    const allowed = privacyOptions(creator)
    if (!Array.isArray(allowed) || allowed.length === 0) throw new Error('tiktok_creator_privacy_options_required')
    const requested = credentials.privacyLevel
    const privacyLevel = requested && allowed.includes(requested) ? requested : allowed[0]
    const initialized = await publishPhoto({
      token,
      title: job.headline,
      description: job.caption,
      photoUrls: [job.imageUrl],
      privacyLevel,
      disableComment: Boolean(credentials.disableComment),
      autoAddMusic: Boolean(credentials.autoAddMusic),
      brandContent: Boolean(credentials.brandContent),
      brandOrganic: credentials.brandOrganic !== false,
      isAigc: Boolean(credentials.isAigc),
    })
    const publishId = initialized?.data?.publish_id ?? initialized?.publish_id
    if (!publishId) throw new Error('tiktok_publish_id_missing')
    const status = await fetchPublishStatus({ token, publishId })
    return {
      destination: 'tiktok', contentId: job.contentId, accountId: credentials.accountId ?? null,
      platformPostId: String(publishId), status: status?.data?.status ?? 'submitted', published: true,
      privacyLevel, providerReceipt: status,
    }
  }

  return publishNomniSocialJob(job, credentials, options)
}

export const OMNITRIX_022_ROUTING = Object.freeze({
  controlled: ['facebook', 'linkedin', 'tiktok'], isolated: ['x', 'instagram'],
  assisted: ['youtube_community'], automaticDailyDistribution: true,
})
