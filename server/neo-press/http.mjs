import { verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'

const PREFIX = '/api/v1/press'
const MAX_BYTES = 12_000
const REQUIRED_ROLES = Object.freeze({
  ACCURACY: 'press:editor',
  PRIVACY: 'press:privacy',
  LEGAL_RISK: 'press:legal'
})
const defaultOrigins = new Set(['https://neo.holytemples.org'])

function respond(res, status, data, origin = '') {
  const body = JSON.stringify(data)
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body), 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
    'content-security-policy': "default-src 'none'", 'vary': 'Origin'
  }
  if (origin) headers['access-control-allow-origin'] = origin
  res.writeHead(status, headers)
  res.end(body)
}
async function jsonBody(req) {
  if (!/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] || ''))) {
    throw Object.assign(new Error('json_content_type_required'), { status: 415 })
  }
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BYTES) throw Object.assign(new Error('request_too_large'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object')
    const forbidden = ['rawBytes', 'sourceUrl', 'sourceName', 'identity', 'credentialImage', 'token', 'privateKey']
    if (forbidden.some(key => Object.hasOwn(data, key))) throw Object.assign(new Error('confidential_payload_not_accepted'), { status: 400 })
    return data
  } catch (error) {
    if (error.status) throw error
    throw Object.assign(new Error('invalid_json'), { status: 400 })
  }
}
function bearer(req) {
  const m = /^Bearer ([a-zA-Z0-9._-]+)$/.exec(String(req.headers.authorization || ''))
  return m?.[1] || null
}
const hasRole = (actor, role) => actor.roles.includes(role)

// A private API handler, not attached to the public platform routes.
// Production must provide a real NEOpass issuer, authoritative press grant
// registry, a dedicated private vault path and verified runtime controls.
export function createPressHttpHandler({
  store = null, authService = null, accessRegistry = null,
  jwtSecret = '', jwtIssuer = 'neo-pass', enabled = false,
  allowedOrigins = defaultOrigins, now = () => Date.now()
} = {}) {
  return async function handlePress(req, res) {
    const url = new URL(req.url || '/', 'http://neo.local')
    if (!url.pathname.startsWith(PREFIX + '/')) return false
    const origin = String(req.headers.origin || '')
    if (origin && !allowedOrigins.has(origin)) {
      respond(res, 403, { error: 'origin_not_allowed' })
      return true
    }
    if (!enabled || !store || !authService || typeof authService.session !== 'function' ||
        !accessRegistry || typeof accessRegistry.resolveAccess !== 'function' ||
        typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
      respond(res, 503, { error: 'press_service_not_certified', writesEnabled: false }, origin)
      return true
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': origin || '',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        'cache-control': 'no-store', 'vary': 'Origin'
      })
      res.end()
      return true
    }
    const token = bearer(req)
    const claims = token ? verifyNeopassToken(token, { secret: jwtSecret, issuer: jwtIssuer, now }) : null
    const nowValue = now()
    const seconds = Math.floor((typeof nowValue === 'number' ? nowValue : Date.parse(nowValue)) / 1000)
    if (!Number.isSafeInteger(seconds) || !claims || typeof claims.sub !== 'string' ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        claims.iat > seconds + 30 || claims.exp <= seconds ||
        claims.exp - claims.iat > 8 * 3600 + 30 ||
        claims.aud !== 'neo-press' || claims.scope !== 'press:case-access' ||
        claims.token_use !== 'neopass-session') {
      respond(res, 401, { error: 'press_scoped_neopass_token_required' }, origin)
      return true
    }
    let actor
    try {
      // JWT claims never establish roles, active status, or case assignments.
      const [member, access] = await Promise.all([
        authService.session(claims.sub), accessRegistry.resolveAccess(claims.sub)
      ])
      if (!member || member.subject !== claims.sub || member.neopassStatus !== 'active' ||
          !access || access.subject !== claims.sub || access.status !== 'active' ||
          !Array.isArray(access.roles) || !Array.isArray(access.caseIds)) {
        respond(res, 403, { error: 'active_press_assignment_required' }, origin)
        return true
      }
      actor = { subject: claims.sub, roles: access.roles, caseIds: access.caseIds }
    } catch {
      respond(res, 503, { error: 'identity_or_press_registry_unavailable' }, origin)
      return true
    }
    try {
      const intake = /^\/api\/v1\/press\/cases\/([A-Za-z0-9_-]+)\/evidence$/.exec(url.pathname)
      if (intake && req.method === 'POST') {
        const caseId = store.normalize(intake[1])
        if (!hasRole(actor, 'press:reporter') || !store.hasCase(actor, caseId)) {
          respond(res, 403, { error: 'case_intake_forbidden' }, origin); return true
        }
        const body = await jsonBody(req)
        const created = store.ingest({ ...body, caseId }, actor.subject)
        respond(res, 201, { evidence: created, published: false }, origin)
        return true
      }
      const review = /^\/api\/v1\/press\/evidence\/([0-9a-f-]{36})\/review$/.exec(url.pathname)
      if (review && req.method === 'POST') {
        const item = store.lookup(review[1])
        if (!item) { respond(res, 404, { error: 'not_found' }, origin); return true }
        const body = await jsonBody(req)
        if (!hasRole(actor, REQUIRED_ROLES[body.gate]) || !store.hasCase(actor, item.case_id)) {
          respond(res, 403, { error: 'independent_review_role_required' }, origin); return true
        }
        const result = store.review(review[1], body.gate, body.decision, actor.subject)
        respond(res, 200, { review: result, published: false }, origin)
        return true
      }
      const candidate = /^\/api\/v1\/press\/evidence\/([0-9a-f-]{36})\/release-candidate$/.exec(url.pathname)
      if (candidate && req.method === 'GET') {
        const item = store.lookup(candidate[1])
        if (!item) { respond(res, 404, { error: 'not_found' }, origin); return true }
        if (!hasRole(actor, 'press:editor') || !store.hasCase(actor, item.case_id)) {
          respond(res, 403, { error: 'editor_case_access_required' }, origin); return true
        }
        respond(res, 200, { candidate: store.releaseCandidate(candidate[1]), published: false }, origin)
        return true
      }
      const custody = /^\/api\/v1\/press\/cases\/([A-Za-z0-9_-]+)\/custody$/.exec(url.pathname)
      if (custody && req.method === 'GET') {
        const caseId = store.normalize(custody[1])
        if (!(hasRole(actor, 'press:auditor') || hasRole(actor, 'press:editor')) || !store.hasCase(actor, caseId)) {
          respond(res, 403, { error: 'custody_access_forbidden' }, origin); return true
        }
        respond(res, 200, { custody: store.custody(caseId), externallyAnchored: false }, origin)
        return true
      }
      respond(res, ['GET','POST'].includes(req.method) ? 404 : 405, { error: 'not_found' }, origin)
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status :
        /not_eligible|approval|required|restricted|independent_/.test(String(error.message)) ? 409 : 400
      respond(res, status, { error: status === 400 ? 'invalid_press_request' :
        status === 409 ? 'review_or_integrity_gate_blocked' : error.message, published: false }, origin)
    }
    return true
  }
}
