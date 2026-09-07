import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createSocialGatewayServer } from './social-gateway-server.mjs'

async function withServer(server, fn) {
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  try { await fn(`http://127.0.0.1:${port}`) } finally { server.close() }
}

const env = {
  LINKEDIN_CLIENT_ID: 'linkedin-id',
  LINKEDIN_CLIENT_SECRET: 'linkedin-secret',
  LINKEDIN_REDIRECT_URI: 'https://neo.example/connect/linkedin/callback',
  TIKTOK_CLIENT_KEY: 'tiktok-key',
  TIKTOK_CLIENT_SECRET: 'tiktok-secret',
  TIKTOK_REDIRECT_URI: 'https://neo.example/connect/tiktok/callback',
}

const trusted = async () => ({ authenticated: true, trustBoundary: 'neo-gateway', subjectId: 'neo-user-1' })

test('connect endpoint requires trusted NEOpass identity', async () => {
  const server = createSocialGatewayServer({ env })
  await withServer(server, async (base) => {
    const response = await fetch(`${base}/connect/linkedin`)
    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), { error: 'neopass_identity_required' })
  })
})

test('LinkedIn connect returns authorization URL without exposing secrets', async () => {
  const server = createSocialGatewayServer({ env, resolveTrustedIdentity: trusted })
  await withServer(server, async (base) => {
    const response = await fetch(`${base}/connect/linkedin`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.providerId, 'linkedin')
    assert.match(body.authorizationUrl, /^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization/)
    assert.ok(body.state)
    assert.ok(!body.authorizationUrl.includes('linkedin-secret'))
  })
})

test('callback consumes state once, stores token server-side, and does not return token', async () => {
  let tokenRequests = 0
  const server = createSocialGatewayServer({
    env,
    resolveTrustedIdentity: trusted,
    fetchImpl: async () => {
      tokenRequests += 1
      return { ok: true, json: async () => ({ access_token: 'secret-token', refresh_token: 'refresh', expires_in: 3600, scope: 'openid profile' }) }
    },
  })
  await withServer(server, async (base) => {
    const start = await fetch(`${base}/connect/linkedin`)
    const { state } = await start.json()
    const callback = await fetch(`${base}/connect/linkedin/callback?code=abc&state=${encodeURIComponent(state)}`)
    assert.equal(callback.status, 200)
    const body = await callback.json()
    assert.deepEqual(body, { status: 'connected', providerId: 'linkedin', identityId: 'neo-user-1', publishing: 'approval-required' })
    assert.ok(!JSON.stringify(body).includes('secret-token'))

    const replay = await fetch(`${base}/connect/linkedin/callback?code=abc&state=${encodeURIComponent(state)}`)
    assert.equal(replay.status, 400)
    assert.deepEqual(await replay.json(), { error: 'oauth_state_invalid_or_expired' })
    assert.equal(tokenRequests, 1)
  })
})
