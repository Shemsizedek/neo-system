import test from 'node:test'
import assert from 'node:assert/strict'
import {
  StewardshipStage,
  classifyWordPressPage,
  createStewardshipEvent,
  createVerificationCandidate,
  approveVerifiedContribution,
  fetchStewardshipPage,
  stewardshipBoundaries
} from './index.mjs'

test('creates a normalized stewardship event', () => {
  const event = createStewardshipEvent({ id: 'evt-1', stage: StewardshipStage.NEW, createdAt: '2026-08-29T00:00:00.000Z', observedAt: '2026-08-29T00:00:00.000Z' })
  assert.equal(event.id, 'evt-1')
  assert.equal(event.site, 'https://holytemples.org')
  assert.equal(event.pageSlug, 'holy-stewardship')
})

test('classifies the Holy Stewardship page as an education snapshot', () => {
  const event = classifyWordPressPage({ id: 2010, slug: 'holy-stewardship', status: 'publish', modified: '2025-03-26T19:15:58', link: 'https://holytemples.org/holy-stewardship/', transport: 'wp-rest' })
  assert.equal(event.type, 'wordpress.stewardship.page_snapshot')
  assert.equal(event.stage, StewardshipStage.EDUCATED)
  assert.equal(event.approvalRequired, false)
  assert.equal(event.metadata.transport, 'wp-rest')
})

test('uses WordPress REST metadata when available', async () => {
  const fetchImpl = async url => {
    assert.match(url, /wp-json\/wp\/v2\/pages/)
    return new Response(JSON.stringify([{ id: 2010, slug: 'holy-stewardship', status: 'publish', modified: '2025-03-26T19:15:58', link: 'https://holytemples.org/holy-stewardship/' }]), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const page = await fetchStewardshipPage({ fetchImpl })
  assert.equal(page.id, 2010)
  assert.equal(page.transport, 'wp-rest')
})

test('falls back to public Holy Stewardship HTML when REST is unavailable', async () => {
  const requests = []
  const fetchImpl = async url => {
    requests.push(url)
    if (url.includes('/wp-json/')) return new Response('not found', { status: 404 })
    return new Response('<html><title>Holy Stewardship</title></html>', { status: 200, headers: { 'last-modified': 'Wed, 26 Mar 2025 19:15:58 GMT', 'content-type': 'text/html' } })
  }
  const page = await fetchStewardshipPage({ fetchImpl })
  assert.equal(requests.length, 2)
  assert.equal(page.id, 2010)
  assert.equal(page.slug, 'holy-stewardship')
  assert.equal(page.link, 'https://holytemples.org/holy-stewardship/')
  assert.equal(page.transport, 'public-html')
})

test('reports a clear error when REST and public page are unavailable', async () => {
  const fetchImpl = async url => new Response('not found', { status: url.includes('/wp-json/') ? 404 : 503 })
  await assert.rejects(fetchStewardshipPage({ fetchImpl }), /Holy Stewardship public page request failed: 503/)
})

test('verification candidates require transaction and wallet identifiers', () => {
  assert.throws(() => createVerificationCandidate({ walletAddress: 'wallet' }), /transactionId/)
  const event = createVerificationCandidate({ transactionId: 'tx-1', walletAddress: 'wallet', asset: 'PLEDGEBOND', amount: '1' })
  assert.equal(event.stage, StewardshipStage.PLEDGE_PENDING)
  assert.equal(event.approvalRequired, true)
})

test('verification approval remains human attributed', () => {
  const candidate = createVerificationCandidate({ transactionId: 'tx-2', walletAddress: 'wallet' })
  assert.throws(() => approveVerifiedContribution(candidate), /approvedBy/)
  const verified = approveVerifiedContribution(candidate, { approvedBy: 'authorized-human', approvedAt: '2026-08-29T01:00:00.000Z' })
  assert.equal(verified.stage, StewardshipStage.VERIFIED)
  assert.equal(verified.metadata.approvedBy, 'authorized-human')
})

test('safety boundaries prohibit autonomous sale and settlement', () => {
  assert.equal(stewardshipBoundaries.autonomousTokenSaleExecution, false)
  assert.equal(stewardshipBoundaries.autonomousTreasurySettlement, false)
  assert.equal(stewardshipBoundaries.blockchainObservationMayRunInBackground, true)
})
