import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { appendFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createStewardshipEvent, stewardshipBoundaries } from './index.mjs'
import { createGitHubOidcVerifier, githubOidcPolicy } from './oidc.mjs'

const DEFAULT_AUDIT_FILE = process.env.NEO_STEWARDSHIP_AUDIT_FILE || 'data/wordpress-stewardship/events.ndjson'

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store'
  })
  res.end(payload)
}

function bearer(req) {
  const header = req.headers.authorization || ''
  return header.startsWith('Bearer ') ? header.slice(7) : ''
}

function matchesSharedToken(supplied, expectedToken) {
  if (!supplied || !expectedToken) return false
  const a = Buffer.from(supplied)
  const b = Buffer.from(expectedToken)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readJson(req, maxBytes = 128 * 1024) {
  let bytes = 0
  const chunks = []
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > maxBytes) throw new Error('payload_too_large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

function validateEnvelope(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_envelope')
  if (!body.event || typeof body.event !== 'object' || Array.isArray(body.event)) throw new Error('invalid_envelope')
  for (const field of ['id', 'type', 'site', 'pageSlug', 'stage']) {
    if (!body.event[field]) throw new Error(`missing_event_field:${field}`)
  }
  const event = createStewardshipEvent(body.event)
  if (event.site !== 'https://holytemples.org') throw new Error('site_not_allowed')
  if (event.pageSlug !== 'holy-stewardship') throw new Error('page_not_allowed')
  if (!String(event.type).startsWith('wordpress.stewardship.') && !String(event.type).startsWith('blockchain.stewardship.')) {
    throw new Error('event_type_not_allowed')
  }
  return { event, boundaries: stewardshipBoundaries }
}

export function createStewardshipGateway({
  token = process.env.NEO_GATEWAY_EVENT_TOKEN,
  verifyOidc = createGitHubOidcVerifier(),
  auditFile = DEFAULT_AUDIT_FILE,
  now = () => new Date().toISOString(),
  appendAudit = async (entry) => {
    await mkdir(dirname(auditFile), { recursive: true })
    await appendFile(auditFile, `${JSON.stringify(entry)}\n`, 'utf8')
  }
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://neo.local')
      if (req.method === 'GET' && url.pathname === '/health') {
        return json(res, 200, {
          service: 'neo-wordpress-stewardship-gateway',
          status: 'ok',
          authenticatedEvents: true,
          authModes: ['github-actions-oidc', ...(token ? ['shared-token-fallback'] : [])],
          githubOidcPolicy,
          generatedAt: now(),
          boundaries: stewardshipBoundaries
        })
      }

      if (url.pathname !== '/api/v1/wordpress/stewardship/events') return json(res, 404, { error: 'not_found' })
      if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' })

      const supplied = bearer(req)
      let authMode = null
      if (matchesSharedToken(supplied, token)) authMode = 'shared-token'
      else if (supplied && await verifyOidc(supplied)) authMode = 'github-actions-oidc'
      if (!authMode) return json(res, 401, { error: 'unauthorized' })

      const body = await readJson(req)
      const envelope = validateEnvelope(body)
      const acceptedAt = now()
      const record = {
        acceptedAt,
        authentication: { mode: authMode },
        event: envelope.event,
        boundaries: envelope.boundaries,
        execution: {
          publish: false,
          settlement: false,
          tokenSale: false,
          privateKeyCustody: false,
          status: envelope.event.approvalRequired ? 'REVIEW_REQUIRED' : 'OBSERVED'
        }
      }
      await appendAudit(record)
      return json(res, 202, {
        accepted: true,
        eventId: envelope.event.id,
        status: record.execution.status,
        authentication: authMode,
        acceptedAt,
        auditRecorded: true
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error'
      if (message === 'payload_too_large') return json(res, 413, { error: message })
      if (message === 'invalid_envelope' || message === 'site_not_allowed' || message === 'page_not_allowed' || message === 'event_type_not_allowed' || message.startsWith('missing_event_field:') || message.startsWith('Unsupported stewardship stage')) {
        return json(res, 400, { error: message })
      }
      if (error instanceof SyntaxError) return json(res, 400, { error: 'invalid_json' })
      return json(res, 500, { error: 'gateway_failure' })
    }
  })
}

export function startStewardshipGateway({ port = Number(process.env.PORT || 8791) } = {}) {
  const server = createStewardshipGateway()
  server.listen(port, () => console.log(`NEO WordPress Stewardship Gateway listening on :${port}`))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startStewardshipGateway()
