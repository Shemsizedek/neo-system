import test from 'node:test'
import assert from 'node:assert/strict'
import {observeContinuityHealth as observe, collectContinuityHealth as collect} from './health-observer.mjs'

const json = data => Response.json(data)
const healthy = () => json({service: 'neo-prime', ok: true})

test('a fixed service identity is required and never grants routing authority', async () => {
  const result = await observe('prime', {fetchImpl: async (url, options) => {
    assert.equal(url, 'https://prime.holytemples.org/health')
    assert.equal(options.redirect, 'manual')
    assert.equal(options.credentials, 'omit')
    assert.equal(options.method, 'GET')
    assert.ok(options.signal instanceof AbortSignal)
    return healthy()
  }})
  assert.equal(result.status, 'healthy')
  assert.equal(result.functionalValidation, false)
  assert.equal(result.failoverEligible, false)
})
test('rejects arbitrary URL and inherited property destinations before fetching', async () => {
  for (const id of ['https://localhost/', 'constructor', '__proto__']) {
    await assert.rejects(observe(id, {fetchImpl: () => assert.fail('must not fetch')}), TypeError)
  }
})
test('HTTP success and wrong application identity remain unknown', async () => {
  for (const response of [new Response('<title>Setup pending</title>'),
    json({ok: true, service: 'temple-continuity'}), json({ok: 'true', service: 'neo-prime'}),
    new Response('broken', {headers: {'content-type': 'application/json'}})]) {
    assert.equal((await observe('prime', {fetchImpl: async () => response})).status, 'unknown')
  }
})
test('redirects and upstream failures are never followed or marked healthy', async () => {
  for (const status of [302, 503, 525]) {
    const result = await observe('school', {fetchImpl: async () => new Response('', {status})})
    assert.equal(result.status, 'down')
    assert.equal(result.httpStatus, status)
  }
})
test('public recovery identity requires its recovery mode', async () => {
  for (const [mode, expected] of [['public-recovery', 'healthy'], ['live', 'unknown']]) {
    const result = await observe('recovery', {fetchImpl: async () => json({ok: true, service: 'temple-continuity', mode})})
    assert.equal(result.status, expected)
  }
})
test('oversized JSON is cancelled and remains unverified', async () => {
  const result = await observe('prime', {fetchImpl: async () => json({ok: true, service: 'neo-prime', extra: 'x'.repeat(17000)})})
  assert.equal(result.status, 'unknown')
})
test('network failure is sanitized and does not prevent other probes', async () => {
  const result = await collect({fetchImpl: async url => {
    if (url.includes('prime')) throw new Error('private transport detail')
    if (url.includes('school')) return json({service: 'gisd', ok: true})
    return json({service: 'temple-continuity', mode: 'public-recovery', ok: true})
  }})
  assert.equal(result.observations.length, 3)
  assert.deepEqual(result.observations.map(row => row.status), ['down', 'healthy', 'healthy'])
  assert.ok(result.observations.every(row => row.failoverEligible === false))
  assert.doesNotMatch(JSON.stringify(result), /private transport detail/)
})
