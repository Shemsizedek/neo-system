import crypto from 'node:crypto'

const OAUTH_PROVIDERS = Object.freeze({
  linkedin: Object.freeze({
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    redirectEnv: 'LINKEDIN_REDIRECT_URI',
    defaultScopes: Object.freeze(['openid', 'profile', 'email', 'w_member_social']),
  }),
  tiktok: Object.freeze({
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    redirectEnv: 'TIKTOK_REDIRECT_URI',
    defaultScopes: Object.freeze(['user.info.basic']),
  }),
})

export function getSocialOAuthProvider(id) {
  const provider = OAUTH_PROVIDERS[id]
  if (!provider) throw new Error(`Unsupported social OAuth provider: ${id}`)
  return provider
}

export function createOAuthState({ identityId, providerId, nonce = crypto.randomBytes(24).toString('base64url') } = {}) {
  if (!identityId) throw new Error('NEOpass identityId is required')
  getSocialOAuthProvider(providerId)
  return { identityId, providerId, nonce, createdAt: Date.now() }
}

export function validateOAuthState(expected, returnedState, { maxAgeMs = 10 * 60 * 1000, now = Date.now() } = {}) {
  if (!expected?.nonce || !returnedState) return false
  const a = Buffer.from(expected.nonce)
  const b = Buffer.from(String(returnedState))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false
  return !Number.isFinite(expected.createdAt) || now - expected.createdAt <= maxAgeMs
}

export function buildSocialAuthorizationUrl({ providerId, identityId, scopes, env = process.env, nonce } = {}) {
  const provider = getSocialOAuthProvider(providerId)
  const clientId = env[provider.clientIdEnv]
  const redirectUri = env[provider.redirectEnv]
  if (!clientId || !redirectUri) throw new Error(`${providerId} OAuth is not configured`)
  const state = createOAuthState({ identityId, providerId, nonce })
  const url = new URL(provider.authorizeUrl)
  const requestedScopes = scopes?.length ? scopes : provider.defaultScopes

  url.searchParams.set(providerId === 'tiktok' ? 'client_key' : 'client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', requestedScopes.join(providerId === 'linkedin' ? ' ' : ','))
  url.searchParams.set('state', state.nonce)

  return { url: url.toString(), state }
}

export async function exchangeSocialAuthorizationCode({ providerId, code, expectedState, returnedState, env = process.env, fetchImpl = fetch, oauthStateMaxAgeMs = 10 * 60 * 1000 } = {}) {
  const provider = getSocialOAuthProvider(providerId)
  if (!validateOAuthState(expectedState, returnedState, { maxAgeMs: oauthStateMaxAgeMs })) throw new Error('OAuth state validation failed')
  if (!code) throw new Error('OAuth authorization code is required')

  const clientId = env[provider.clientIdEnv]
  const clientSecret = env[provider.clientSecretEnv]
  const redirectUri = env[provider.redirectEnv]
  if (!clientId || !clientSecret || !redirectUri) throw new Error(`${providerId} OAuth is not configured`)

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_secret: clientSecret,
  })
  body.set(providerId === 'tiktok' ? 'client_key' : 'client_id', clientId)

  const response = await fetchImpl(provider.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`${providerId} token exchange failed (${response.status})`)
    error.providerBody = payload
    throw error
  }

  return {
    providerId,
    identityId: expectedState.identityId,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresIn: payload.expires_in ?? null,
    scope: payload.scope ?? payload.scopes ?? null,
    raw: payload,
  }
}

export { OAUTH_PROVIDERS }
