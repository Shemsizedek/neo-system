// NEO Social — NOMNI / Ausarian content lane payload contract v0.1

const ALLOWED_DESTINATIONS = Object.freeze([
  'facebook',
  'linkedin',
  'youtube_community',
])

const CLAIM_CLASSES = Object.freeze([
  'externally-verifiable',
  'issuer-defined',
  'market-calculation',
  'doctrine',
])

export function buildNomniSocialPayload({
  title,
  caption,
  altText,
  imageUrl,
  sourceDocument,
  sourceVersion,
  claims = [],
  destinations = ALLOWED_DESTINATIONS,
  contentId,
} = {}) {
  for (const [field, value] of Object.entries({ title, caption, altText, imageUrl, sourceDocument, sourceVersion })) {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}_required`)
  }
  if (!/^https:\/\//i.test(imageUrl)) throw new Error('image_url_must_be_https')
  if (!Array.isArray(destinations) || destinations.length === 0) throw new Error('destinations_required')
  for (const destination of destinations) {
    if (!ALLOWED_DESTINATIONS.includes(destination)) throw new Error(`destination_not_allowed:${destination}`)
  }

  const normalizedClaims = claims.map((claim, index) => {
    if (!claim || typeof claim.text !== 'string' || !claim.text.trim()) throw new Error(`claim_text_required:${index}`)
    if (!CLAIM_CLASSES.includes(claim.classification)) throw new Error(`claim_classification_invalid:${index}`)
    return {
      text: claim.text.trim(),
      classification: claim.classification,
      source: claim.source ?? sourceDocument,
    }
  })

  const id = contentId || `nomni:${sourceDocument}:${sourceVersion}`
  return {
    schema: 'neo.social.nomni.v0.1',
    contentLane: 'nomni_ausarian',
    contentId: id,
    title: title.trim(),
    caption: caption.trim(),
    media: {
      type: 'image',
      aspectRatio: '16:9',
      imageUrl,
      altText: altText.trim(),
    },
    provenance: {
      sourceDocument: sourceDocument.trim(),
      sourceVersion: sourceVersion.trim(),
      claims: normalizedClaims,
    },
    destinations: [...new Set(destinations)],
    worldBulletin: false,
    approval: {
      class: 'B-with-fixed-template',
      required: true,
    },
    receiptRequired: true,
  }
}

export function buildPlatformJobs(payload) {
  if (payload?.schema !== 'neo.social.nomni.v0.1' || payload?.contentLane !== 'nomni_ausarian') {
    throw new Error('invalid_nomni_payload')
  }
  if (payload.worldBulletin !== false) throw new Error('world_bulletin_route_locked')

  return payload.destinations.map((destination) => ({
    destination,
    contentId: payload.contentId,
    imageUrl: payload.media.imageUrl,
    altText: payload.media.altText,
    caption: payload.caption,
    title: payload.title,
    idempotencyKey: `${payload.contentLane}:${payload.provenance.sourceVersion}:${destination}`,
    receipt: {
      required: true,
      fields: ['destination', 'account_id', 'published_at', 'platform_post_id', 'status'],
    },
  }))
}

export { ALLOWED_DESTINATIONS, CLAIM_CLASSES }
