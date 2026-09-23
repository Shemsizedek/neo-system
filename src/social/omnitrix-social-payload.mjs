// NEO Social — Omnitrix Chronicles payload contract v0.2

const ALLOWED_DESTINATIONS = Object.freeze([
  'facebook', 'linkedin', 'x', 'tiktok', 'instagram', 'youtube_community',
])

export function buildOmnitrixSocialPayload({
  headline, episodeDate, topicSummary, panels, finalCaption, sources,
  imageUrl, altText, captions, destinations = ALLOWED_DESTINATIONS, contentId,
} = {}) {
  for (const [field, value] of Object.entries({ headline, episodeDate, topicSummary, finalCaption, imageUrl, altText })) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}_required`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(episodeDate)) throw new Error('episode_date_invalid')
  if (!/^https:\/\//i.test(imageUrl)) throw new Error('image_url_must_be_https')
  if (!Array.isArray(panels) || panels.length === 0) throw new Error('panels_required')
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('sources_required')
  if (!captions || typeof captions !== 'object') throw new Error('captions_required')
  if (!Array.isArray(destinations) || destinations.length === 0) throw new Error('destinations_required')
  for (const destination of destinations) {
    if (!ALLOWED_DESTINATIONS.includes(destination)) throw new Error(`destination_not_allowed:${destination}`)
    if (typeof captions[destination] !== 'string' || !captions[destination].trim()) throw new Error(`caption_required:${destination}`)
  }
  const normalizedSources = sources.map((source, index) => {
    if (!source || typeof source.url !== 'string' || !/^https:\/\//i.test(source.url)) throw new Error(`source_url_required:${index}`)
    if (typeof source.title !== 'string' || !source.title.trim()) throw new Error(`source_title_required:${index}`)
    return { title: source.title.trim(), url: source.url, publishedAt: source.publishedAt ?? null }
  })
  return {
    schema: 'neo.social.omnitrix.v0.2',
    contentLane: 'omnitrix_chronicles',
    contentId: contentId || `omnitrix:${episodeDate}:${headline.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    headline: headline.trim(), episodeDate, topicSummary: topicSummary.trim(), panels,
    finalCaption: finalCaption.trim(),
    media: { type: 'image', imageUrl, altText: altText.trim() },
    provenance: { sources: normalizedSources, refreshAtPublishTime: true },
    captions: Object.fromEntries(destinations.map((d) => [d, captions[d].trim()])),
    destinations: [...new Set(destinations)],
    worldBulletin: false,
    approval: { class: 'B-with-fixed-template', required: true },
    controls: {
      killSwitchEnv: 'NEO_SOCIAL_OMNITRIX_ENABLED',
      auditDestination: 'audit/social/omnitrix-publication-receipts.ndjson',
      receiptPersistenceRequiredForSuccess: true,
    },
  }
}

export function buildOmnitrixPlatformJobs(payload, { env = process.env } = {}) {
  if (payload?.schema !== 'neo.social.omnitrix.v0.2' || payload?.contentLane !== 'omnitrix_chronicles') throw new Error('invalid_omnitrix_payload')
  if (payload.worldBulletin !== false) throw new Error('world_bulletin_route_locked')
  if (env.NEO_SOCIAL_OMNITRIX_ENABLED !== 'true') throw new Error('omnitrix_kill_switch_closed')
  return payload.destinations.map((destination) => ({
    destination,
    contentId: payload.contentId,
    episodeDate: payload.episodeDate,
    imageUrl: payload.media.imageUrl,
    altText: payload.media.altText,
    caption: payload.captions[destination],
    headline: payload.headline,
    sources: payload.provenance.sources,
    idempotencyKey: `${payload.contentLane}:${payload.episodeDate}:${destination}`,
    auditDestination: payload.controls.auditDestination,
    receipt: {
      required: true,
      persistBeforeSuccess: true,
      fields: ['episode_date','topic','sources','destination','account_id','image_asset','alt_text','caption','published_at','platform_post_id','status'],
    },
  }))
}

export { ALLOWED_DESTINATIONS }
