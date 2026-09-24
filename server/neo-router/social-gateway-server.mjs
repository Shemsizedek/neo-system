import http from 'node:http'
import { timingSafeEqual } from 'node:crypto'
import { buildSocialAuthorizationUrl, exchangeSocialAuthorizationCode } from './social-oauth.mjs'
import { buildOmnitrixPlatformJobs } from '../../src/social/omnitrix-social-payload.mjs'

function respond(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

async function readJson(req, maxBytes = 1024 * 1024) {
  const chunks=[]; let size=0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('request_too_large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function trustedSubject(identity) {
  const subjectId = identity?.subjectId
  if (identity?.trustBoundary !== 'neo-gateway' || !identity?.authenticated || typeof subjectId !== 'string' || !subjectId.trim()) {
    throw new Error('neopass_identity_required')
  }
  return subjectId.trim()
}

function httpsUri(value) {
  if (!value) return false
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function bearer(req) {
  const value=String(req.headers?.authorization||'')
  return value.startsWith('Bearer ')?value.slice(7):''
}
function constantTimeEqual(a,b){
  const aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||''))
  return aa.length===bb.length && aa.length>0 && timingSafeEqual(aa,bb)
}
function automationAuthorized(req,env){
  return constantTimeEqual(bearer(req),env.NEO_SOCIAL_AUTOMATION_TOKEN)
}

export function socialRuntimeReadiness(env = process.env, {automationStore, publishOmnitrixJob} = {}) {
  const linkedin = {
    clientId: Boolean(env.LINKEDIN_CLIENT_ID),
    clientSecret: Boolean(env.LINKEDIN_CLIENT_SECRET),
    redirectUri: Boolean(env.LINKEDIN_REDIRECT_URI),
    redirectHttps: httpsUri(env.LINKEDIN_REDIRECT_URI),
  }
  linkedin.ready = Object.values(linkedin).every(Boolean)

  const tiktok = {
    clientKey: Boolean(env.TIKTOK_CLIENT_KEY),
    clientSecret: Boolean(env.TIKTOK_CLIENT_SECRET),
    redirectUri: Boolean(env.TIKTOK_REDIRECT_URI),
    redirectHttps: httpsUri(env.TIKTOK_REDIRECT_URI),
  }
  tiktok.ready = Object.values(tiktok).every(Boolean)

  const facebook = {
    provider: env.FACEBOOK_PROVIDER || null,
    pageId: Boolean(env.FACEBOOK_PAGE_ID),
    pageAccessToken: Boolean(env.FACEBOOK_PAGE_ACCESS_TOKEN),
  }
  facebook.ready = facebook.provider === 'existing-organic' || (facebook.pageId && facebook.pageAccessToken)

  const x = {
    bearerToken: Boolean(env.X_BEARER_TOKEN),
    oauth1Authorization: Boolean(env.X_OAUTH1_AUTHORIZATION),
  }
  x.ready = Object.values(x).every(Boolean)

  const omnitrix = {
    enabled: env.NEO_SOCIAL_OMNITRIX_ENABLED === 'true',
    failClosed: true,
    automationAuthenticated: Boolean(env.NEO_SOCIAL_AUTOMATION_TOKEN),
    durableStore: Boolean(automationStore),
    publisherWired: typeof publishOmnitrixJob === 'function',
  }

  return {
    ready: linkedin.ready && tiktok.ready,
    publishing: omnitrix.enabled && omnitrix.automationAuthenticated && omnitrix.durableStore && omnitrix.publisherWired,
    activationRequested: omnitrix.enabled,
    linkedin,
    tiktok,
    facebook,
    x,
    instagram: { ready: false, reason: 'adapter-not-configured' },
    youtubeCommunity: { ready: true, executionMode: 'browser-ui' },
    omnitrix,
  }
}

export function createMemorySocialOAuthStore() {
  const pending = new Map()
  const connections = new Map()
  return {
    async putState(state) { pending.set(`${state.providerId}:${state.nonce}`, { ...state }) },
    async consumeState(providerId, nonce, { maxAgeMs = 10 * 60 * 1000, now = Date.now() } = {}) {
      const key = `${providerId}:${nonce}`
      const state = pending.get(key) ?? null
      pending.delete(key)
      if (state && Number.isFinite(maxAgeMs) && now - state.createdAt > maxAgeMs) return null
      return state
    },
    async saveConnection(connection) { connections.set(`${connection.identityId}:${connection.providerId}`, { ...connection }) },
    async getConnection(identityId, providerId) { return connections.get(`${identityId}:${providerId}`) ?? null },
  }
}

export function createSocialGatewayServer({
  resolveTrustedIdentity,
  store = createMemorySocialOAuthStore(),
  automationStore,
  publishOmnitrixJob,
  env = process.env,
  fetchImpl = fetch,
  oauthStateMaxAgeMs = 10 * 60 * 1000,
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://neo.local')
      const connectMatch = url.pathname.match(/^\/connect\/(linkedin|tiktok)$/)
      const apiLinkedInConnect = url.pathname === '/api/integrations/linkedin/connect'
      const callbackMatch = url.pathname.match(/^\/connect\/(linkedin|tiktok)\/callback$/)
      const apiLinkedInCallback = url.pathname === '/api/integrations/linkedin/callback'

      if (req.method === 'GET' && url.pathname === '/health') {
        return respond(res, 200, {
          ok: true,
          service: 'neo-social-gateway',
          ...socialRuntimeReadiness(env,{automationStore,publishOmnitrixJob}),
        })
      }

      if (req.method === 'POST' && url.pathname === '/automation/omnitrix/daily') {
        if (!automationAuthorized(req,env)) return respond(res,401,{error:'automation_unauthorized'})
        if (env.NEO_SOCIAL_OMNITRIX_ENABLED !== 'true') return respond(res,503,{error:'omnitrix_kill_switch_closed'})
        if (!automationStore || typeof publishOmnitrixJob !== 'function') return respond(res,503,{error:'omnitrix_automation_not_ready'})

        const body=await readJson(req)
        const headerKey=String(req.headers['idempotency-key']||'')
        const key=headerKey || String(body.idempotencyKey||'')
        if (!/^omnitrix:\d{4}-\d{2}-\d{2}$/.test(key)) return respond(res,400,{error:'invalid_idempotency_key'})
        if (headerKey && body.idempotencyKey && headerKey !== body.idempotencyKey) return respond(res,400,{error:'idempotency_key_mismatch'})

        const payload=body.payload || await automationStore.getApprovedPayload()
        if (!payload) { res.writeHead(204,{'cache-control':'no-store'}); return res.end() }

        const jobs=buildOmnitrixPlatformJobs(payload,{env})
        const receipts=[]
        for (const job of jobs) {
          const existing=await automationStore.getReceipt(key,job.destination)
          if (existing) { receipts.push({...existing,replayed:true}); continue }

          const claimed=await automationStore.claim(key,job.destination)
          if (!claimed) {
            receipts.push({destination:job.destination,contentId:job.contentId,status:'uncertain-inflight',published:false,replayed:true,recordedAt:new Date().toISOString()})
            continue
          }

          let receipt
          try {
            const result=await publishOmnitrixJob(job)
            receipt={
              idempotencyKey:key,
              destination:job.destination,
              contentId:job.contentId,
              status:result?.status || (result?.published===false?'not-published':'published'),
              published:result?.published !== false,
              platformPostId:result?.platformPostId ?? null,
              recordedAt:new Date().toISOString(),
              providerResult:result ?? null,
            }
          } catch (error) {
            receipt={
              idempotencyKey:key,
              destination:job.destination,
              contentId:job.contentId,
              status:'failed',
              published:false,
              error:error instanceof Error?error.message:'unknown',
              recordedAt:new Date().toISOString(),
            }
          }
          await automationStore.saveReceipt(key,job.destination,receipt)
          receipts.push(receipt)
        }
        const failed=receipts.filter(r=>r.status==='failed'||r.status==='uncertain-inflight')
        return respond(res,failed.length?207:200,{ok:failed.length===0,idempotencyKey:key,contentId:payload.contentId,receipts})
      }

      if (req.method === 'GET' && (connectMatch || apiLinkedInConnect)) {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const identityId = trustedSubject(await resolveTrustedIdentity(req))
        const providerId = apiLinkedInConnect ? 'linkedin' : connectMatch[1]
        const readiness = socialRuntimeReadiness(env)[providerId]
        if (!readiness?.ready) return respond(res, 503, { error: `${providerId}_oauth_not_ready` })
        const { url: authorizationUrl, state } = buildSocialAuthorizationUrl({ providerId, identityId, env })
        await store.putState(state)
        if (apiLinkedInConnect) {
          res.writeHead(302, { location: authorizationUrl, 'cache-control': 'no-store' })
          return res.end()
        }
        return respond(res, 200, { providerId, authorizationUrl, state: state.nonce })
      }

      if (req.method === 'GET' && (callbackMatch || apiLinkedInCallback)) {
        const providerId = apiLinkedInCallback ? 'linkedin' : callbackMatch[1]
        const returnedState = url.searchParams.get('state')
        const code = url.searchParams.get('code')
        if (!returnedState) return respond(res, 400, { error: 'oauth_state_required' })
        const expectedState = await store.consumeState(providerId, returnedState, { maxAgeMs: oauthStateMaxAgeMs })
        if (!expectedState) return respond(res, 400, { error: 'oauth_state_invalid_or_expired' })

        const token = await exchangeSocialAuthorizationCode({ providerId, code, expectedState, returnedState, env, fetchImpl, oauthStateMaxAgeMs })
        await store.saveConnection({
          identityId: token.identityId, providerId: token.providerId, accessToken: token.accessToken,
          refreshToken: token.refreshToken, expiresIn: token.expiresIn, scope: token.scope, connectedAt: Date.now(),
        })
        return respond(res, 200, { status: 'connected', providerId: token.providerId, identityId: token.identityId, publishing: 'approval-required' })
      }

      return respond(res, 404, { error: 'not_found' })
    } catch (error) {
      if (error?.message === 'neopass_identity_required') return respond(res, 401, { error: 'neopass_identity_required' })
      if (error?.message === 'request_too_large') return respond(res,413,{error:'request_too_large'})
      return respond(res, 400, { error: 'social_gateway_request_rejected', detail: error instanceof Error?error.message:'unknown' })
    }
  })
}

export function startSocialGatewayServer({
  port = Number(process.env.PORT || process.env.NEO_SOCIAL_GATEWAY_PORT || 8799),
  host = process.env.HOST || '127.0.0.1',
  resolveTrustedIdentity,
  env = process.env,
  automationStore,
  publishOmnitrixJob,
} = {}) {
  return createSocialGatewayServer({ resolveTrustedIdentity, env, automationStore, publishOmnitrixJob }).listen(port, host)
}
