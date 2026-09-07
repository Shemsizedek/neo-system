import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSocialAuthorizationUrl, exchangeSocialAuthorizationCode, validateOAuthState } from './social-oauth.mjs'

test('LinkedIn authorization URL binds NEOpass identity to CSRF state', () => {
  const { url, state } = buildSocialAuthorizationUrl({
    providerId: 'linkedin',
    identityId: 'neo-user-1',
    nonce: 'fixed-state',
    env: {
      LINKEDIN_CLIENT_ID: 'linkedin-client',
      LINKEDIN_REDIRECT_URI: 'https://neo.example/auth/linkedin/callback',
    },
  })
  const parsed = new URL(url)
  assert.equal(parsed.origin + parsed.pathname, 'https://www.linkedin.com/oauth/v2/authorization')
  assert.equal(parsed.searchParams.get('client_id'), 'linkedin-client')
  assert.equal(parsed.searchParams.get('state'), 'fixed-state')
  assert.equal(state.identityId, 'neo-user-1')
})

test('TikTok token exchange validates state and uses v2 token endpoint', async () => {
  const expectedState = { identityId: 'neo-user-2', providerId: 'tiktok', nonce: 'state-2' }
  let request
  const result = await exchangeSocialAuthorizationCode({
    providerId: 'tiktok',
    code: 'auth-code',
    expectedState,
    returnedState: 'state-2',
    env: {
      TIKTOK_CLIENT_KEY: 'tt-client',
      TIKTOK_CLIENT_SECRET: 'tt-secret',
      TIKTOK_REDIRECT_URI: 'https://neo.example/auth/tiktok/callback',
    },
    fetchImpl: async (url, options) => {
      request = { url, options }
      return {
        ok: true,
        json: async () => ({ access_token: 'token', refresh_token: 'refresh', expires_in: 3600 }),
      }
    },
  })
  assert.equal(request.url, 'https://open.tiktokapis.com/v2/oauth/token/')
  assert.equal(result.identityId, 'neo-user-2')
  assert.equal(result.accessToken, 'token')
  assert.equal(validateOAuthState(expectedState, 'wrong-state'), false)
})

test('OAuth callback fails closed when state does not match', async () => {
  await assert.rejects(() => exchangeSocialAuthorizationCode({
    providerId: 'linkedin',
    code: 'auth-code',
    expectedState: { identityId: 'neo-user-3', providerId: 'linkedin', nonce: 'expected' },
    returnedState: 'attacker',
    env: {
      LINKEDIN_CLIENT_ID: 'id',
      LINKEDIN_CLIENT_SECRET: 'secret',
      LINKEDIN_REDIRECT_URI: 'https://neo.example/auth/linkedin/callback',
    },
  }), /state validation failed/)
})
