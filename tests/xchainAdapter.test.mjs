import test from 'node:test'
import assert from 'node:assert/strict'
import {XChainExplorerAdapter} from '../src/explorer/xchainAdapter.ts'

const response = (data, headers = {}) => new Response(JSON.stringify(data), {headers})
test('uses documented testnet token route and read-only credential-free requests', async () => {
  let called
  const adapter = new XChainExplorerAdapter(async (url, options) => {
    called = {url, options}
    return response({data: [{tick: 'XCHAIN'}]}, {'XChain-Freshness': 'live'})
  })
  const result = await adapter.read('TBTC', 'tokens', 'XCHAIN')
  assert.equal(called.url, 'https://explorer.xchain.io/TBTC/api/tokens/XCHAIN/token?limit=20')
  assert.equal(called.options.method, 'GET')
  assert.equal(called.options.credentials, 'omit')
  assert.equal(called.options.redirect, 'error')
  assert.equal(result.freshness, 'live')
  assert.equal(result.network, 'TBTC')
})
test('rejects mainnet, unknown resources and path injection before fetching', async () => {
  const adapter = new XChainExplorerAdapter(() => {throw new Error('unexpected fetch')})
  await assert.rejects(adapter.read('BTC', 'status'), /testnets/)
  await assert.rejects(adapter.read('TBTC', 'broadcast'), /Unsupported/)
  await assert.rejects(adapter.read('TBTC', 'tokens', '../NOMNI'), /ticker/)
})
test('fails visibly on HTTP errors and malformed envelopes', async () => {
  await assert.rejects(new XChainExplorerAdapter(async () => new Response('', {status:503})).read('TBTC','status'), /503/)
  await assert.rejects(new XChainExplorerAdapter(async () => response({error:'bad'})).read('TBTC','status'), /Invalid/)
})
test('stale markers override live headers; missing markers remain unknown', async () => {
  assert.equal((await new XChainExplorerAdapter(async () => response({data:[], freshness:{stale:true}}, {'XChain-Freshness':'live'})).read('TBTC','tokens','XCHAIN')).freshness, 'stale')
  assert.equal((await new XChainExplorerAdapter(async () => response({data:[]})).read('TBTC','tokens','XCHAIN')).freshness, 'unknown')
})
test('status requires explicit freshness and halt checks for selected network', async () => {
  const read = async data => (await new XChainExplorerAdapter(async () => response({data})).read('TLTC','status')).freshness
  assert.equal(await read({available:{TLTC:'Litecoin testnet'}, stale:{TLTC:false}, replica_halted:{TLTC:false}}), 'live')
  assert.equal(await read({available:{TLTC:'Litecoin testnet'}, stale:{TLTC:false}, replica_halted:{TLTC:true}}), 'stale')
  assert.equal(await read({available:{TLTC:'Litecoin testnet'}, stale:{TLTC:false}}), 'unknown')
})
test('propagates cancellation to transport', async () => {
  const controller = new AbortController()
  controller.abort()
  const adapter = new XChainExplorerAdapter(async (_url, options) => {options.signal.throwIfAborted()})
  await assert.rejects(adapter.read('TBTC','status',undefined,controller.signal), {name:'AbortError'})
})
