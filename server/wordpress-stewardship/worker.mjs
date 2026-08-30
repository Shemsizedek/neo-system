import { runObservation, stewardshipBoundaries } from './index.mjs'

const gatewayUrl = process.env.NEO_GATEWAY_EVENT_URL
const gatewayToken = process.env.NEO_GATEWAY_EVENT_TOKEN

async function emit(event) {
  if (!gatewayUrl) {
    process.stdout.write(`${JSON.stringify({ event, boundaries: stewardshipBoundaries })}\n`)
    return
  }

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(gatewayToken ? { authorization: `Bearer ${gatewayToken}` } : {})
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
