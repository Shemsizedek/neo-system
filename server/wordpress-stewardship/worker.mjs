import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { runObservation, stewardshipBoundaries } from './index.mjs'
import { getGitHubActionsOidcToken } from './oidc.mjs'

const gatewayUrl = process.env.NEO_GATEWAY_EVENT_URL
const fallbackEnabled = String(process.env.NEO_STEWARDSHIP_ALLOW_LOCAL_FALLBACK || '').toLowerCase() === 'true'
const eventFile = process.env.NEO_STEWARDSHIP_EVENT_FILE

async function resolveGatewayToken() {
  if (process.env.NEO_GATEWAY_EVENT_TOKEN) return process.env.NEO_GATEWAY_EVENT_TOKEN
  return getGitHubActionsOidcToken()
}

async function persistLocal(envelope) {
  const line = `${JSON.stringify(envelope)}\n`
  if (!eventFile) {
    process.stdout.write(line)
    return
  }
  await mkdir(dirname(eventFile), { recursive: true })
  await writeFile(eventFile, line, 'utf8')
  process.stdout.write(`[wordpress-stewardship] local audit written to ${eventFile}\n`)
}

async function emit(envelope) {
  if (!gatewayUrl) {
    await persistLocal(envelope)
    return { mode: 'LOCAL_AUDIT' }
  }

  try {
    const gatewayToken = await resolveGatewayToken()
    if (!gatewayToken) throw new Error('No gateway authentication method is available')

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${gatewayToken}`
      },
      body: JSON.stringify(envelope)
    })

    if (!response.ok) throw new Error(`NEO Gateway event emission failed: ${response.status}`)
    return { mode: 'GATEWAY' }
  } catch (error) {
    if (!fallbackEnabled) throw error
    console.warn('[wordpress-stewardship] gateway unavailable; preserving observation locally:', error instanceof Error ? error.message : error)
    await persistLocal(envelope)
    return { mode: 'LOCAL_FALLBACK' }
  }
}

try {
  const event = await runObservation({ site: process.env.WORDPRESS_SITE_URL ?? 'https://holytemples.org' })
  const envelope = {
    observedAt: new Date().toISOString(),
    event,
    boundaries: stewardshipBoundaries,
    execution: {
      publish: false,
      settlement: false,
      tokenSale: false,
      privateKeyCustody: false
    }
  }
  const result = await emit(envelope)
  process.stdout.write(`[wordpress-stewardship] completed via ${result.mode}\n`)
} catch (error) {
  console.error('[wordpress-stewardship]', error instanceof Error ? error.message : error)
  process.exitCode = 1
}
