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
  await assert.rejects(adapter.read('BTC', 'status'), /Bitcoin testnet/)
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
  const read = async data => (await new XChainExplorerAdapter(async () => response({data})).read('TBTC','status')).freshness
  assert.equal(await read({available:{TBTC:'Bitcoin testnet'}, stale:{TBTC:false}, replica_halted:{TBTC:false}}), 'live')
  assert.equal(await read({available:{TBTC:'Bitcoin testnet'}, stale:{TBTC:false}, replica_halted:{TBTC:true}}), 'stale')
  assert.equal(await read({available:{TBTC:'Bitcoin testnet'}, stale:{TBTC:false}}), 'unknown')
})
test('propagates cancellation to transport', async () => {
  const controller = new AbortController()
  controller.abort()
  const adapter = new XChainExplorerAdapter(async (_url, options) => {options.signal.throwIfAborted()})
  await assert.rejects(adapter.read('TBTC','status',undefined,controller.signal), {name:'AbortError'})
})

test('rejects every non-Bitcoin network before transport', async () => {
  let calls = 0
  const adapter = new XChainExplorerAdapter(async () => { calls++; throw new Error('unexpected transport') })
  for (const coin of ['TLTC','TDOGE','LTC','DOGE','BTC','RBTC']) {
    await assert.rejects(adapter.read(coin,'status'), /Only Bitcoin testnet/)
  }
  assert.equal(calls, 0)
})
test('projects status onto Bitcoin without exposing other network records', async () => {
  const result = await new XChainExplorerAdapter(async () => response({data:{
    available:{TBTC:'Bitcoin testnet',TLTC:'Litecoin testnet'},
    last_block:{TBTC:100,TLTC:200},
    stale:{TBTC:false,TLTC:false}, replica_halted:{TBTC:false,TLTC:false}
  }})).read('TBTC','status')
  assert.equal(result.data.last_block,100)
  assert.equal(result.data.available,'Bitcoin testnet')
  assert.equal(JSON.stringify(result.data).includes('TLTC'),false)
})

test('accepts live top-level XChain status without leaking other networks', async () => {
  const data = {available:{TBTC:'BTC (testnet)',TLTC:'LTC (testnet)'},chain_tip:{TBTC:158133,TLTC:4945764},stale:{TBTC:false,TLTC:false},replica_halted:{TBTC:false,TLTC:false}}
  const result = await new XChainExplorerAdapter(async () => response(data)).read('TBTC','status')
  assert.equal(result.data.available,'BTC (testnet)')
  assert.equal(result.network,'TBTC')
  assert.equal(JSON.stringify(result.data).includes('TLTC'),false)
  assert.equal(result.freshness,'live')
})
