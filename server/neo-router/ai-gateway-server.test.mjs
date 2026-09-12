import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createNeoAiGatewayServer } from './ai-gateway-server.mjs'

async function request(server, path, options = {}) {
  const address = server.address()
  return fetch(`http://127.0.0.1:${address.port}${path}`, options)
}

async function withServer(factory, fn) {
  const server = factory()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await fn(server) } finally { server.close(); await once(server, 'close') }
}

const router = {
  health() {
    return { ok: true, configured: ['gemini'], providers: [{ id: 'gemini', configured: true }], capabilities: ['frontend'] }
  },
  async execute(mission, { approved }) {
    if (mission.actions.includes('publish') && !approved) return { status: 'awaiting_approval', missionId: mission.missionId }
    return { status: 'completed', route: 'gemini', missionId: mission.missionId, result: { text: mission.objective } }
  },
}

const trusted = async () => ({ authenticated: true, trustBoundary: 'neo-gateway', subjectId: 'neo-user-1' })

test('health is public and exposes readiness without secrets', async () => {
  await withServer(() => createNeoAiGatewayServer({ router }), async (server) => {
    const response = await request(server, '/health')
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.service, 'neo-ai-gateway')
    assert.deepEqual(body.router.configured, ['gemini'])
  })
})

test('provider inventory requires trusted NEO Gateway identity', async () => {
  await withServer(() => createNeoAiGatewayServer({ router }), async (server) => {
    assert.equal((await request(server, '/api/ai/providers')).status, 401)
  })

  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/providers')
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.subjectId, 'neo-user-1')
  })
})

test('execute normalizes a provider-neutral mission and preserves approval gates', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objective: 'Enhance the dashboard', capability: 'frontend' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'completed')
    assert.equal(body.route, 'gemini')
  })

  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objective: 'Publish change', capability: 'frontend', actions: ['publish'] }),
    })
    assert.equal(response.status, 202)
    assert.equal((await response.json()).status, 'awaiting_approval')
  })
})

test('execute rejects malformed mission requests', async () => {
  await withServer(() => createNeoAiGatewayServer({ router, resolveTrustedIdentity: trusted }), async (server) => {
    const response = await request(server, '/api/ai/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capability: 'frontend' }),
    })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).error, 'mission_fields_required')
  })
})
