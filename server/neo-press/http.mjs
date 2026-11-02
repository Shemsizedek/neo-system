import { verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { randomBytes } from 'node:crypto'
import { sha256 } from './evidence.mjs'
import { renderPressPortal } from './portal.mjs'
import { exchangeNooglePressSession } from './session-exchange.mjs'

const PREFIX = '/api/v1/press'
const MAX_BYTES = 12_000
const MAX_MEDIA_BYTES = 8 * 1024 * 1024
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
async function mediaBody(req, maxBytes = MAX_MEDIA_BYTES) {
  if (String(req.headers['content-type'] || '').toLowerCase() !== 'application/octet-stream') {
    throw Object.assign(new Error('binary_media_content_type_required'), { status: 415 })
  }
  const declared = Number(req.headers['content-length'])
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw Object.assign(new Error('media_too_large'), { status: 413 })
  }
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw Object.assign(new Error('media_too_large'), { status: 413 })
    chunks.push(chunk)
  }
  if (size < 1) throw Object.assign(new Error('empty_media_not_allowed'), { status: 400 })
  return Buffer.concat(chunks)
}
function privatePortalResponse(res, html, origin) {
  const nonce = randomBytes(18).toString('base64url')
  const content = html.replace('<script>', '<script nonce="' + nonce + '">')
  const headers = {
    'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(content),
    'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'none'; script-src 'nonce-" + nonce + "'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'vary': 'Origin'
  }
  if (origin) headers['access-control-allow-origin'] = origin
  res.writeHead(200, headers)
  res.end(content)
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
  store = null, mediaStore = null, authService = null, accessRegistry = null,
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
    // Exchange existing unscoped Noogle NEOpass session for a 5-minute
    // audience-scoped press token. No browser passwords, user-supplied roles,
    // refresh tokens, persistent storage or automatic membership creation.
    if (url.pathname === '/api/v1/press/session/exchange' && req.method === 'POST') {
      const result = await exchangeNooglePressSession({
        baseToken:bearer(req),jwtSecret,jwtIssuer,authService,accessRegistry,now
      })
      respond(res,result.status,result.ok?{
        token:result.token,tokenType:result.tokenType,expiresAt:result.expiresAt,
        roleClaimsTrusted:false
      }:{error:result.error},origin)
      return true
    }
    // The public shell contains no source data, case IDs or credentials.
    // All case data and the private portal endpoint still require press tokens.
    if (url.pathname === '/api/v1/press/login' && req.method === 'GET') {
      privatePortalResponse(res,renderPressPortal(),origin)
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
      if (url.pathname === '/api/v1/press/portal' && req.method === 'GET') {
        if (!actor.roles.some(r => String(r).startsWith('press:')) || !actor.caseIds.length) {
          respond(res, 403, { error: 'press_desk_access_forbidden' }, origin); return true
        }
        privatePortalResponse(res, renderPressPortal(), origin)
        return true
      }
      async function sealAndLink(id, item, originalBytes) {
        if (!mediaStore || typeof mediaStore.seal !== 'function' ||
            typeof mediaStore.verify !== 'function' || typeof mediaStore.discardUnlinked !== 'function' ||
            typeof store.attachVerifiedMedia !== 'function') {
          throw Object.assign(new Error('verified_media_vault_unavailable'), { status: 503 })
        }
        const receipt = mediaStore.seal({
          caseId: item.case_id, evidenceId: id, originalBytes, expectedSha256: item.original_sha256
        })
        try {
          const proof = mediaStore.verify({caseId:item.case_id,evidenceId:id,originalSha256:item.original_sha256})
          return store.attachVerifiedMedia(id,receipt,proof,actor.subject)
        } catch (error) {
          // A newly created encrypted orphan is discarded; raw source bytes were never persisted.
          mediaStore.discardUnlinked(id)
          throw error
        }
      }
      const sealedIntake = /^\/api\/v1\/press\/cases\/([A-Za-z0-9_-]+)\/sealed-intake$/.exec(url.pathname)
      if (sealedIntake && req.method === 'POST') {
        const caseId = store.normalize(sealedIntake[1])
        if (!hasRole(actor,'press:reporter') || !store.hasCase(actor,caseId)) {
          respond(res,403,{error:'case_intake_forbidden'},origin);return true
        }
        if (!mediaStore) { respond(res,503,{error:'verified_media_vault_unavailable'},origin);return true }
        const bytes = await mediaBody(req)
        try {
          const created = store.ingest({
            caseId, title:'Restricted historical press credential',
            originalSha256:sha256(bytes), sourceLocatorSha256:sha256(randomBytes(32)),
            sourceTier:'LEAD', editorialState:'UNRESOLVED', accessLevel:'RESTRICTED',
            sourceKind:'CREDENTIAL', observedAt:new Date(now()).toISOString()
          }, actor.subject, {sealedIntake:true})
          const item = store.lookup(created.id)
          const verified = await sealAndLink(created.id,item,bytes)
          respond(res,201,{evidenceId:created.id,media:verified,credentialCurrentStatusVerified:false,published:false},origin)
        } finally { bytes.fill(0) }
        return true
      }
      const media = /^\/api\/v1\/press\/evidence\/([0-9a-f-]{36})\/media$/.exec(url.pathname)
      if (media && req.method === 'POST') {
        const item = store.lookup(media[1])
        if (!item) { respond(res,404,{error:'not_found'},origin);return true }
        if (!hasRole(actor,'press:reporter') || !store.hasCase(actor,item.case_id)) {
          respond(res,403,{error:'media_intake_forbidden'},origin);return true
        }
        if (store.getMediaStatus(media[1]).originalVerified) {
          respond(res,409,{error:'original_media_already_linked'},origin);return true
        }
        const bytes = await mediaBody(req)
        try {
          const verified = await sealAndLink(media[1],item,bytes)
          respond(res,201,{media:verified,published:false},origin)
        } finally { bytes.fill(0) }
        return true
      }
      const preflight = /^\/api\/v1\/press\/evidence\/([0-9a-f-]{36})\/release-preflight$/.exec(url.pathname)
      if (preflight && req.method === 'GET') {
        const item = store.lookup(preflight[1])
        if (!item) { respond(res,404,{error:'not_found'},origin);return true }
        if (!hasRole(actor,'press:editor') || !store.hasCase(actor,item.case_id)) {
          respond(res,403,{error:'editor_case_access_required'},origin);return true
        }
        respond(res,200,{preflight:store.publicationPreflight(preflight[1],mediaStore),published:false},origin)
        return true
      }
      const catalog = /^\/api\/v1\/press\/cases\/([A-Za-z0-9_-]+)\/evidence$/.exec(url.pathname)
      if (catalog && req.method === 'GET') {
        const caseId=store.normalize(catalog[1])
        if (!store.hasCase(actor,caseId) ||
            !actor.roles.some(r=>['press:reporter','press:editor','press:auditor','press:privacy','press:legal'].includes(r))) {
          respond(res,403,{error:'case_catalog_access_forbidden'},origin);return true
        }
        const rawLimit=url.searchParams.get('limit') ?? '25'
        const rawOffset=url.searchParams.get('offset') ?? '0'
        if(!/^\d{1,3}$/.test(rawLimit)||!/^\d{1,3}$/.test(rawOffset)){
          respond(res,400,{error:'invalid_page'},origin);return true
        }
        respond(res,200,{catalog:store.listCaseEvidence(caseId,{limit:Number(rawLimit),offset:Number(rawOffset)}),
          published:false},origin)
        return true
      }
      const corrections = /^\/api\/v1\/press\/evidence\/([0-9a-f-]{36})\/corrections$/.exec(url.pathname)
      if(corrections && ['GET','POST'].includes(req.method)){
        const item=store.lookup(corrections[1])
        if(!item){respond(res,404,{error:'not_found'},origin);return true}
        if(!store.hasCase(actor,item.case_id) ||
          !actor.roles.some(r=>['press:reporter','press:editor','press:auditor','press:privacy','press:legal'].includes(r))){
          respond(res,403,{error:'case_correction_access_forbidden'},origin);return true
        }
        if(req.method==='GET'){
          respond(res,200,{corrections:store.listCorrections(item.id),published:false},origin)
          return true
        }
        if(!actor.roles.some(r=>['press:editor','press:privacy'].includes(r))){
          respond(res,403,{error:'editorial_correction_role_required'},origin);return true
        }
        const body=await jsonBody(req)
        const corrected=store.submitCorrection(item.id,{category:body.category,summary:body.summary},actor.subject)
        respond(res,201,{correction:corrected,published:false},origin)
        return true
      }
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
        /not_eligible|approval|required|restricted|independent_|verification_|integrity_|original_media|correction_publication_hold/.test(String(error.message)) ? 409 : 400
      respond(res, status, { error: status === 400 ? 'invalid_press_request' :
        status === 409 ? 'review_or_integrity_gate_blocked' :
        status === 503 ? 'verified_media_vault_unavailable' : error.message, published: false }, origin)
    }
    return true
  }
}
