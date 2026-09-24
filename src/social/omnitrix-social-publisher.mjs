import { publishNomniSocialJob } from './nomni-social-publisher.mjs'

const CONTROLLED_DESTINATIONS = new Set(['facebook', 'linkedin', 'tiktok'])
const ISOLATED_DESTINATIONS = new Set(['x', 'instagram'])

/**
 * OMNITRIX-021 controlled publication dispatcher.
 *
 * This deliberately does not enable automatic publishing. The runtime kill
 * switch remains authoritative. X/Instagram stay isolated until their
 * adapters are production-ready; YouTube Community remains assisted.
 */
export async function publishOmnitrixSocialJob(job, credentials = {}, options = {}) {
  if (!job?.destination) throw new Error('destination_required')

  if (ISOLATED_DESTINATIONS.has(job.destination)) {
    return {
      destination: job.destination,
      contentId: job.contentId,
      status: 'isolated',
      published: false,
      reason: 'provider_not_enabled_for_omnitrix_021',
    }
  }

  if (job.destination === 'youtube_community') {
    return publishNomniSocialJob(job, credentials, options)
  }

  if (!CONTROLLED_DESTINATIONS.has(job.destination)) {
    throw new Error(`unsupported_destination:${job.destination}`)
  }

  if (job.destination === 'tiktok') {
    // TikTok credentials/runtime are connected, but the existing TikTok
    // client requires an explicit publishing contract before a live post is
    // allowed. Fail closed rather than fabricate a publication receipt.
    return {
      destination: 'tiktok',
      contentId: job.contentId,
      status: 'connected_pending_publisher_contract',
      published: false,
    }
  }

  return publishNomniSocialJob(job, credentials, options)
}

export const OMNITRIX_021_ROUTING = Object.freeze({
  controlled: ['facebook', 'linkedin', 'tiktok'],
  isolated: ['x', 'instagram'],
  assisted: ['youtube_community'],
  automaticDailyDistribution: false,
})
