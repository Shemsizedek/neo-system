import test from 'node:test'
import assert from 'node:assert/strict'
import {CounterpartyHealthAdapter} from '../src/explorer/counterpartyHealthAdapter.ts'

const payload = (overrides = {}) => ({result: {
  network: 'mainnet', server_ready: true, backend_height: 900002,
  counterparty_height: 900001, ledger_state: 'Following', ...overrides,
}})
const response = (result, {headers = {}, status = 200} = {}) =>
  new Response(JSON.stringify(result), {status, headers})

test('read-only and credential-free Counterparty Core v2 on Bitcoin mainnet', async () => {
  let called
  const adapter = new CounterpartyHealthAdapter(async (url, options) => {
    called = {url, options}
    return response(payload(), {headers: {'X-COUNTERPARTY-READY': 'true'}})
  })
  const data = await adapter.read()
  assert.equal(called.url, 'https://api.counterparty.io:4000/v2/')
  assert.equal(called.options.method, 'GET')
  assert.equal(called.options.credentials, 'omit')
  assert.equal(called.options.redirect, 'error')
  assert.equal(data.network, 'bitcoin-mainnet')
  assert.equal(data.readiness, 'ready')
  assert.equal(data.counterpartyHeight, 900001)
})
test('lagging or false readiness is never reported as ready', async () => {
  for (const overrides of [
    {counterparty_height: 899999}, {server_ready: false}, {ledger_state: 'Catching Up'},
  ]) {
    const adapter = new CounterpartyHealthAdapter(async () => response(payload(overrides)))
    assert.equal((await adapter.read()).readiness, 'lagging')
  }
  const headerAdapter = new CounterpartyHealthAdapter(async () => response(payload(), {headers: {'X-COUNTERPARTY-READY': 'false'}}))
  assert.equal((await headerAdapter.read()).readiness, 'lagging')
})
test('unknown readiness remains unknown when evidence is incomplete', async () => {
  const adapter = new CounterpartyHealthAdapter(async () => response(payload({ledger_state: undefined})))
  assert.equal((await adapter.read()).readiness, 'unknown')
})
test('rejects wrong network, failed upstream and malformed envelopes', async () => {
  await assert.rejects(new CounterpartyHealthAdapter(async () => response(payload({network: 'testnet'}))).read(), /mainnet/)
  await assert.rejects(new CounterpartyHealthAdapter(async () => response({error:'unavailable'}, {status: 503})).read(), /503/)
  await assert.rejects(new CounterpartyHealthAdapter(async () => response({error:'missing result'})).read(), /Invalid/)
})
test('honors cancellation before transporting data', async () => {
  const controller = new AbortController()
  controller.abort()
  const adapter = new CounterpartyHealthAdapter(async (_url, options) => {options.signal.throwIfAborted()})
  await assert.rejects(adapter.read(controller.signal), {name: 'AbortError'})
})
