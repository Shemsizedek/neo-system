import http from 'node:http'
import { buildSocialAuthorizationUrl, exchangeSocialAuthorizationCode } from './social-oauth.mjs'

function respond(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
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

export function socialRuntimeReadiness(env = process.env) {
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

  return {
    ready: linkedin.ready && tiktok.ready,
    publishing: false,
    linkedin,
    tiktok,
  }
}

export function createMemorySocialOAuthStore() {
  const pending = new Map()
  const connections = new Map()
  return {
    async putState(state) {
      pending.set(`${state.providerId}:${state.nonce}`, { ...state })
    },
    async consumeState(providerId, nonce) {
      const key = `${providerId}:${nonce}`
      const state = pending.get(key) ?? null
      pending.delete(key)
      return state
    },
    async saveConnection(connection) {
      connections.set(`${connection.identityId}:${connection.providerId}`, { ...connection })
    },
    async getConnection(identityId, providerId) {
      return connections.get(`${identityId}:${providerId}`) ?? null
    },
  }
}

export function createSocialGatewayServer({
  resolveTrustedIdentity,
  store = createMemorySocialOAuthStore(),
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://neo.local')
      const connectMatch = url.pathname.match(/^\/connect\/(linkedin|tiktok)$/)
      const callbackMatch = url.pathname.match(/^\/connect\/(linkedin|tiktok)\/callback$/)

      if (req.method === 'GET' && url.pathname === '/health') {
        return respond(res, 200, {
          ok: true,
          service: 'neo-social-gateway',
          ...socialRuntimeReadiness(env),
        })
      }

      if (req.method === 'GET' && connectMatch) {
        if (typeof resolveTrustedIdentity !== 'function') return respond(res, 401, { error: 'neopass_identity_required' })
        const identityId = trustedSubject(await resolveTrustedIdentity(req))
        const providerId = connectMatch[1]
        const readiness = socialRuntimeReadiness(env)[providerId]
        if (!readiness?.ready) return respond(res, 503, { error: `${providerId}_oauth_not_ready` })
        const { url: authorizationUrl, state } = buildSocialAuthorizationUrl({ providerId, identityId, env })
        await store.putState(state)
        return respond(res, 200, { providerId, authorizationUrl, state: state.nonce })
      }

      if (req.method === 'GET' && callbackMatch) {
        const providerId = callbackMatch[1]
        const returnedState = url.searchParams.get('state')
        const code = url.searchParams.get('code')
        if (!returnedState) return respond(res, 400, { error: 'oauth_state_required' })
        const expectedState = await store.consumeState(providerId, returnedState)
        if (!expectedState) return respond(res, 400, { error: 'oauth_state_invalid_or_expired' })

        const token = await exchangeSocialAuthorizationCode({
          providerId,
          code,
          expectedState,
          returnedState,
          env,
          fetchImpl,
        })
        await store.saveConnection({
          identityId: token.identityId,
          providerId: token.providerId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresIn: token.expiresIn,
          scope: token.scope,
          connectedAt: Date.now(),
        })
        return respond(res, 200, {
          status: 'connected',
          providerId: token.providerId,
          identityId: token.identityId,
          publishing: 'approval-required',
        })
      }

      return respond(res, 404, { error: 'not_found' })
    } catch (error) {
      if (error?.message === 'neopass_identity_required') return respond(res, 401, { error: 'neopass_identity_required' })
      return respond(res, 400, { error: 'social_oauth_request_rejected' })
    }
  })
}

export function startSocialGatewayServer({
  port = Number(process.env.NEO_SOCIAL_GATEWAY_PORT || 8799),
  resolveTrustedIdentity,
} = {}) {
  return createSocialGatewayServer({ resolveTrustedIdentity }).listen(port, '127.0.0.1')
}
