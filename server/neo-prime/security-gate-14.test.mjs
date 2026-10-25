import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { createPrimeHttpServer } from './server.mjs'

const provider = { id: 'test-provider', configured: true, async invoke({ prompt }) { return { provider: 'test-provider', text: prompt } } }

async function withServer(fn, env = {}) {
  const server = createPrimeHttpServer({ providers: [provider], env })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await fn(`http://127.0.0.1:${server.address().port}`) }
  finally { server.close(); await once(server, 'close') }
}

const privileged = { missionId: 'security-gate-14', objective: 'Deploy production', capability: 'orchestration', actions: ['production_deployment'], approved: true }
const post = (base, body, headers = {}) => fetch(`${base}/api/prime`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

test('privileged command fails closed when operator token is absent', async () => {
  await withServer(async base => {
    const response = await post(base, privileged, { authorization: 'Bearer guessed', 'x-neo-prime-approval': 'approved' })
    assert.equal(response.status, 202)
    assert.equal((await response.json()).status, 'awaiting_approval')
  })
})

test('privileged command requires all three approval factors', async () => {
  await withServer(async base => {
    for (const [body, headers] of [
      [{ ...privileged, approved: false }, { authorization: 'Bearer test-secret', 'x-neo-prime-approval': 'approved' }],
      [privileged, { 'x-neo-prime-approval': 'approved' }],
      [privileged, { authorization: 'Bearer test-secret' }],
      [privileged, { authorization: 'Bearer incorrect', 'x-neo-prime-approval': 'approved' }],
    ]) {
      const response = await post(base, body, headers)
      assert.equal(response.status, 202)
      assert.equal((await response.json()).approvalRequired, true)
    }
  }, { NEO_PRIME_OPERATOR_TOKEN: 'test-secret' })
})

test('disallowed origin is denied even with valid operator credentials', async () => {
  await withServer(async base => {
    const response = await post(base, privileged, { origin: 'https://attacker.invalid', authorization: 'Bearer test-secret', 'x-neo-prime-approval': 'approved' })
    assert.equal(response.status, 403)
    assert.equal((await response.json()).error, 'origin_not_allowed')
  }, { NEO_PRIME_OPERATOR_TOKEN: 'test-secret' })
})

test('oversized request is rejected before execution', async () => {
  await withServer(async base => {
    const response = await post(base, { objective: 'x'.repeat(70_000) })
    assert.equal(response.status, 413)
    assert.equal((await response.json()).error, 'bad_request')
  })
})
