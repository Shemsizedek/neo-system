import test from 'node:test'
import assert from 'node:assert/strict'
import { extractPublicConversionSurfaces, summarizeConversionReadiness, observeConversionIntelligence } from './intelligence.mjs'

test('extracts only public stewardship conversion links', () => {
  const html = `
    <a href="/about/">About</a>
    <a href="/give/">Give to the Temple</a>
    <a href="https://example.com/wallet">Bitcoin Wallet</a>
  `
  const surfaces = extractPublicConversionSurfaces(html)
  assert.equal(surfaces.length, 2)
  assert.equal(surfaces[0].href, 'https://holytemples.org/give/')
})

test('summarizes wallet CTA as highest non-executing readiness stage', () => {
  const summary = summarizeConversionReadiness([
    { text: 'Support the Temple', href: 'https://holytemples.org/give/' },
    { text: 'Bitcoin Wallet', href: 'https://example.com/wallet' }
  ])
  assert.equal(summary.stage, 'WALLET_CTA_PRESENT')
  assert.equal(summary.executionRequired, false)
  assert.equal(summary.financialVerificationRequired, false)
})

test('observes conversion surfaces without executing any action', async () => {
  const fetchImpl = async () => ({
    ok: true,
    text: async () => '<a href="/stewardship-form/">Become a Steward</a>'
  })
  const event = await observeConversionIntelligence({ fetchImpl })
  assert.equal(event.type, 'wordpress.stewardship.conversion_snapshot')
  assert.equal(event.boundaries.readOnly, true)
  assert.equal(event.boundaries.executesPayment, false)
  assert.equal(event.summary.hasMembershipLanguage, true)
})
