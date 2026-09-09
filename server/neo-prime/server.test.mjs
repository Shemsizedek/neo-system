import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createPrimeHttpServer } from './server.mjs'

function provider(id = 'openai') {
  return {
    id,
    configured: true,
    async invoke({ prompt }) {
      return { provider: id, text: `Prime response: ${prompt}` }
    },
  }
}

async function withServer(fn, options = {}) {
  const server = createPrimeHttpServer({ providers: [provider()], env: options.env || {} })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  try {
    await fn(`http://127.0.0.1:${port}`)
  } finally {
    server.close()
    await once(server, 'close')
  }
}

test('health exposes Prime and configured provider state', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/healthz`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(body.prime, 'active')
    assert.deepEqual(body.configuredProviders, ['openai'])
  })
})

test('green reasoning command executes without operator token', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: 'T-1', objective: 'Analyze priorities', capability: 'reasoning' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'completed')
    assert.equal(body.text, 'Prime response: Analyze priorities')
    assert.equal(body.risk, 'green')
  })
})

test('approval-gated command stops without explicit authorization', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: 'T-2', objective: 'Deploy production', capability: 'orchestration', actions: ['production_deployment'] }),
    })
    assert.equal(response.status, 202)
    const body = await response.json()
    assert.equal(body.status, 'awaiting_approval')
    assert.equal(body.approvalRequired, true)
  })
})

test('approved command requires operator bearer token and approval header', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer test-secret',
        'x-neo-prime-approval': 'approved',
      },
      body: JSON.stringify({ missionId: 'T-3', objective: 'Deploy approved production', capability: 'orchestration', actions: ['production_deployment'], approved: true }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'completed')
  }, { env: { NEO_PRIME_OPERATOR_TOKEN: 'test-secret' } })
})

test('unapproved origin is rejected', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://example.invalid' },
      body: JSON.stringify({ objective: 'Analyze priorities', capability: 'reasoning' }),
    })
    assert.equal(response.status, 403)
  })
})
