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

test('public liveness exposes minimal status without provider details', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/healthz`)
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(body.service, 'neo-prime-runtime')
    assert.equal(Object.hasOwn(body, 'configuredProviders'), false)
    assert.equal(Object.hasOwn(body, 'providers'), false)
  })
})

test('green reasoning command executes with operator token', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test-secret' },
      body: JSON.stringify({ missionId: 'T-1', objective: 'Analyze priorities', capability: 'reasoning' }),
    })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.status, 'completed')
    assert.equal(body.text, 'Prime response: Analyze priorities')
    assert.equal(body.risk, 'green')
  }, { env: { NEO_PRIME_OPERATOR_TOKEN: 'test-secret' } })
})

test('approval-gated command stops without explicit authorization', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/prime`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ missionId: 'T-2', objective: 'Deploy production', capability: 'orchestration', actions: ['production_deployment'] }),
    })
    assert.equal(response.status, 401)
    const body = await response.json()
    assert.equal(body.error, 'authentication_required')
    assert.equal(body.approvalRequired, undefined)
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


test('Oracle staging serves a visible noncached HTML shell on root and oracle routes', async () => {
  await withServer(async (base) => {
    for (const route of ['/', '/oracle', '/oracle/']) {
      const response = await fetch(`${base}${route}`)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type') || '', /text\/html/)
      assert.match(response.headers.get('cache-control') || '', /no-store/)
      const html = await response.text()
      assert.match(html, /<main class="app">/)
      assert.match(html, /NEO ORACLE/)
      assert.match(html, /<textarea id="q"/)
      assert.match(html, /\[hidden\]\{display:none!important\}/)
    }
  })
})

test('Oracle evidence API fails closed without operator authentication', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/oracle/evidence`, {method:'POST', headers:{'content-type':'application/json'},body:'{}'})
    assert.equal(response.status,401)
  }, {env:{NEO_PRIME_OPERATOR_TOKEN:'test-secret'}})
})
test('Oracle evidence API refuses to claim independent chain verification', async () => {
  await withServer(async (base) => {
    const evidence = {source:'neo-scan',network:'signet',txid:'a'.repeat(64),blockHash:'b'.repeat(64),confirmations:3,observedAt:new Date().toISOString(),asset:'NOMNI'}
    const response = await fetch(`${base}/api/oracle/evidence`,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer test-secret'},body:JSON.stringify(evidence)})
    assert.equal(response.status,200)
    const data = await response.json()
    assert.equal(data.assessment.publishable,false)
    assert.equal(data.assessment.status,'unverified')
    assert.equal(data.networkVerification,'not-connected')
  },{env:{NEO_PRIME_OPERATOR_TOKEN:'test-secret'}})
})
