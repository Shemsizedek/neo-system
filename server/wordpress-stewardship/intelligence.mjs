const ACTION_TEXT = /(?:give|donate|contribute|pledge|support|steward|join|member|subscribe|wallet|bitcoin|btc|nomni|xcp|treasury)/i

export function extractPublicConversionSurfaces(html, { baseUrl = 'https://holytemples.org/holy-stewardship/' } = {}) {
  if (typeof html !== 'string') throw new Error('HTML is required')
  const surfaces = []
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = anchorPattern.exec(html))) {
    const rawHref = match[1]
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (!ACTION_TEXT.test(`${text} ${rawHref}`)) continue
    let href = rawHref
    try { href = new URL(rawHref, baseUrl).toString() } catch {}
    surfaces.push({ kind: 'link', text, href })
  }

  const unique = []
  const seen = new Set()
  for (const surface of surfaces) {
    const key = `${surface.kind}|${surface.text}|${surface.href}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(surface)
  }
  return unique
}

export function summarizeConversionReadiness(surfaces = []) {
  const hrefs = surfaces.map((item) => item.href || '').join(' ')
  const text = surfaces.map((item) => item.text || '').join(' ')
  const hasContributionLanguage = /give|donate|contribute|pledge|support/i.test(`${text} ${hrefs}`)
  const hasWalletLanguage = /wallet|bitcoin|btc|nomni|xcp/i.test(`${text} ${hrefs}`)
  const hasMembershipLanguage = /join|member|subscribe|steward/i.test(`${text} ${hrefs}`)

  let stage = 'EDUCATION_ONLY'
  if (hasContributionLanguage) stage = 'CONTRIBUTION_CTA_PRESENT'
  if (hasWalletLanguage) stage = 'WALLET_CTA_PRESENT'

  return Object.freeze({
    stage,
    surfaceCount: surfaces.length,
    hasContributionLanguage,
    hasWalletLanguage,
    hasMembershipLanguage,
    executionRequired: false,
    financialVerificationRequired: false
  })
}

export async function observeConversionIntelligence({ pageUrl = 'https://holytemples.org/holy-stewardship/', fetchImpl = fetch } = {}) {
  const response = await fetchImpl(pageUrl, { headers: { accept: 'text/html' } })
  if (!response.ok) throw new Error(`Stewardship intelligence request failed: ${response.status}`)
  const html = await response.text()
  const surfaces = extractPublicConversionSurfaces(html, { baseUrl: pageUrl })
  const summary = summarizeConversionReadiness(surfaces)
  return Object.freeze({
    type: 'wordpress.stewardship.conversion_snapshot',
    pageUrl,
    observedAt: new Date().toISOString(),
    surfaces,
    summary,
    boundaries: {
      readOnly: true,
      executesPayment: false,
      createsWallet: false,
      verifiesBlockchainContribution: false,
      publishesContent: false
    }
  })
}
