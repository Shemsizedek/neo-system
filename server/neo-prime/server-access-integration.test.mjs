import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createPrimeHttpServer } from './server.mjs'

async function run(fn) {
  let calls = 0
  const provider = { id: 'mock', configured: true, async invoke() { calls++; return { provider: 'mock', text: 'ok' } } }
  const server = createPrimeHttpServer({ providers: [provider], env: { NEO_PRIME_OPERATOR_TOKEN: 'test-only' } })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await fn(`http://127.0.0.1:${server.address().port}`, () => calls) }
  finally { server.close(); await once(server, 'close') }
}

test('unauthenticated green command cannot invoke provider', async () => {
  await run(async (base, calls) => {
    const response = await fetch(`${base}/api/prime`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ objective: 'Analyze', capability: 'reasoning' }) })
    assert.equal(response.status, 401)
    assert.equal(calls(), 0)
  })
})

test('public liveness remains accessible and detailed health is protected', async () => {
  await run(async base => {
    const publicHealth = await fetch(`${base}/healthz`)
    assert.equal(publicHealth.status, 200)
    const publicBody = await publicHealth.json()
    assert.equal(publicBody.ok, true)
    assert.equal(Object.hasOwn(publicBody, 'providers'), false)
    assert.equal(Object.hasOwn(publicBody, 'configuredProviders'), false)
    assert.equal((await fetch(`${base}/health`)).status, 401)
    assert.equal((await fetch(`${base}/health`, { headers: { authorization: 'Bearer test-only' } })).status, 200)
  })
})


test('unauthenticated malformed requests are rejected before JSON parsing', async () => {
  await run(async (base, calls) => {
    const response = await fetch(`${base}/api/oracle`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not-json' })
    assert.equal(response.status, 401)
    assert.equal(calls(), 0)
  })
})
