import { runObservation, stewardshipBoundaries } from './index.mjs'
import { getGitHubActionsOidcToken } from './oidc.mjs'

const gatewayUrl = process.env.NEO_GATEWAY_EVENT_URL

async function resolveGatewayToken() {
  if (process.env.NEO_GATEWAY_EVENT_TOKEN) return process.env.NEO_GATEWAY_EVENT_TOKEN
  return getGitHubActionsOidcToken()
}

async function emit(event) {
  if (!gatewayUrl) {
    process.stdout.write(`${JSON.stringify({ event, boundaries: stewardshipBoundaries })}\n`)
    return
  }

  const gatewayToken = await resolveGatewayToken()
  if (!gatewayToken) throw new Error('No gateway authentication method is available')

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${gatewayToken}`
    },
    body: JSON.stringify({ event, boundaries: stewardshipBoundaries })
  })

  if (!response.ok) {
    throw new Error(`NEO Gateway event emission failed: ${response.status}`)
  }
}

try {
  const event = await runObservation({ site: process.env.WORDPRESS_SITE_URL ?? 'https://holytemples.org' })
  await emit(event)
} catch (error) {
  console.error('[wordpress-stewardship]', error instanceof Error ? error.message : error)
  process.exitCode = 1
}
