const DEFAULT_SITE = 'https://holytemples.org'
const DEFAULT_PAGE_SLUG = 'holy-stewardship'
const DEFAULT_PAGE_ID = 2010

export const StewardshipStage = Object.freeze({
  NEW: 'NEW',
  EDUCATED: 'EDUCATED',
  WALLET_READY: 'WALLET_READY',
  PLEDGE_PENDING: 'PLEDGE_PENDING',
  VERIFIED: 'VERIFIED',
  REVIEW_REQUIRED: 'REVIEW_REQUIRED'
})

export function createStewardshipEvent(input = {}) {
  const now = new Date().toISOString()
  const event = {
    id: input.id ?? `stewardship-${crypto.randomUUID()}`,
    type: input.type ?? 'wordpress.stewardship.observed',
    site: input.site ?? DEFAULT_SITE,
    pageSlug: input.pageSlug ?? DEFAULT_PAGE_SLUG,
    stage: input.stage ?? StewardshipStage.NEW,
    source: input.source ?? 'wordpress',
    wordpressResourceId: input.wordpressResourceId ?? null,
    walletAddress: input.walletAddress ?? null,
    asset: input.asset ?? null,
    amount: input.amount ?? null,
    transactionId: input.transactionId ?? null,
    approvalRequired: input.approvalRequired ?? true,
    createdAt: input.createdAt ?? now,
    observedAt: input.observedAt ?? now,
    metadata: input.metadata ?? {}
  }

  if (!Object.values(StewardshipStage).includes(event.stage)) {
    throw new Error(`Unsupported stewardship stage: ${event.stage}`)
  }

  return Object.freeze(event)
}

export function classifyWordPressPage(page) {
  if (!page || typeof page !== 'object') throw new Error('WordPress page payload is required')
  return createStewardshipEvent({
    type: 'wordpress.stewardship.page_snapshot',
    wordpressResourceId: page.id ?? null,
    stage: StewardshipStage.EDUCATED,
    approvalRequired: false,
    metadata: {
      slug: page.slug ?? DEFAULT_PAGE_SLUG,
      modified: page.modified ?? null,
      link: page.link ?? null,
      status: page.status ?? null,
      transport: page.transport ?? 'wp-rest'
    }
  })
}

export function createVerificationCandidate(input = {}) {
  if (!input.transactionId) throw new Error('transactionId is required')
  if (!input.walletAddress) throw new Error('walletAddress is required')

  return createStewardshipEvent({
    type: 'blockchain.stewardship.verification_candidate',
    stage: StewardshipStage.PLEDGE_PENDING,
    walletAddress: input.walletAddress,
    asset: input.asset ?? null,
    amount: input.amount ?? null,
    transactionId: input.transactionId,
    source: 'blockchain',
    approvalRequired: true,
    metadata: input.metadata ?? {}
  })
}

export function approveVerifiedContribution(event, approval = {}) {
  if (!event?.transactionId) throw new Error('A transaction-backed event is required')
  if (!approval.approvedBy) throw new Error('approvedBy is required')

  return createStewardshipEvent({
    ...event,
    id: `stewardship-${crypto.randomUUID()}`,
    type: 'treasury.stewardship.verified',
    stage: StewardshipStage.VERIFIED,
    approvalRequired: false,
    metadata: {
      ...event.metadata,
      approvedBy: approval.approvedBy,
      approvedAt: approval.approvedAt ?? new Date().toISOString(),
      sourceEventId: event.id
    }
  })
}

async function fetchViaPublicHtml(site, fetchImpl) {
  const link = `${site.replace(/\/$/, '')}/${DEFAULT_PAGE_SLUG}/`
  const response = await fetchImpl(link, { headers: { accept: 'text/html,application/xhtml+xml' } })
  if (!response.ok) throw new Error(`Holy Stewardship public page request failed: ${response.status}`)
  await response.text()
  return {
    id: DEFAULT_PAGE_ID,
    slug: DEFAULT_PAGE_SLUG,
    status: 'publish',
    modified: response.headers?.get?.('last-modified') ?? null,
    link,
    transport: 'public-html'
  }
}

export async function fetchStewardshipPage({ site = DEFAULT_SITE, fetchImpl = fetch } = {}) {
  const endpoint = `${site.replace(/\/$/, '')}/wp-json/wp/v2/pages?slug=${encodeURIComponent(DEFAULT_PAGE_SLUG)}&_fields=id,slug,status,modified,link`
  try {
    const response = await fetchImpl(endpoint, { headers: { accept: 'application/json' } })
    if (response.ok) {
      const pages = await response.json()
      if (Array.isArray(pages) && pages.length > 0) return { ...pages[0], transport: 'wp-rest' }
    }
  } catch {}
  return fetchViaPublicHtml(site, fetchImpl)
}

export async function runObservation(options = {}) {
  const page = await fetchStewardshipPage(options)
  return classifyWordPressPage(page)
}

export const stewardshipBoundaries = Object.freeze({
  wordpressStoresPrivateKeys: false,
  autonomousTokenSaleExecution: false,
  autonomousTreasurySettlement: false,
  publicPublishingRequiresApproval: true,
  regulatedOfferingRequiresComplianceReview: true,
  blockchainObservationMayRunInBackground: true
})
