import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutPaymentVerifier, createCounterpartyPaymentReader } from './payment-verifier.mjs';
import { createStore } from './store.mjs';

const txid = 'ab'.repeat(32), blockHash = 'cd'.repeat(32);
const now = () => new Date('2026-11-08T00:01:00.000Z');
const order = { merchantId: 'vendor', orderId: 'sale', network: 'bitcoin-mainnet', rail: 'COUNTERPARTY',
  asset: 'NOMNI', destination: 'synthetic-vendor-wallet', amountAtomic: '250000000', minConfirmations: 2, expiresAt: '2026-11-08T00:05:00.000Z' };
const reference = { txid, eventIndex: 0 };
function fixture() {
  const f = {
    chain: { chain: 'main', initialblockdownload: false, blocks: 900001, headers: 900001 },
    tx: { txid, blockhash: blockHash, confirmations: 2, vout: [{ n: 0, value: 2.5, scriptPubKey: { address: order.destination } }] },
    header: { hash: blockHash, height: 900000, time: 1794096030, confirmations: 2 },
    activeHash: blockHash,
    status: { network: 'mainnet', server_ready: true, ledger_state: 'Following', backend_height: 900001, counterparty_height: 900001 },
    block: { block_index: 900000, block_hash: blockHash },
    sends: [{ tx_hash: txid, msg_index: 0, block_index: 900000, asset: 'NOMNI', destination: order.destination, quantity: 250000000, asset_info: { divisible: true }, status: 'valid' }],
    calls: [], paths: [],
  };
  f.rpc = async (method, args) => {
    f.calls.push({ method, args });
    switch (method) {
      case 'getblockchaininfo': return f.chain;
      case 'getrawtransaction': return f.tx;
      case 'getblockheader': return f.header;
      case 'getblockhash': return f.activeHash;
      default: throw new Error(`unexpected RPC ${method}`);
    }
  };
  f.counterpartyGet = async path => {
    f.paths.push(path);
    if (path === '') return f.status;
    if (path === 'blocks/900000') return f.block;
    if (path === `transactions/${txid}/sends?limit=1000&verbose=true`) return f.sends;
    throw new Error('unexpected path');
  };
  f.verify = createCheckoutPaymentVerifier({ rpc: f.rpc, counterpartyGet: f.counterpartyGet, now });
  return f;
}

test('Counterparty verifier checks valid send against independently confirmed Bitcoin block', async () => {
  const f = fixture();
  const result = await f.verify(order, reference);
  assert.equal(result.amountAtomic, '250000000');
  assert.equal(result.blockTime, '2026-11-08T00:00:30.000Z');
  assert.equal(result.confirmations, 2);
  assert.equal(result.destination, order.destination);
  assert.equal(f.calls.filter(x => x.method === 'getrawtransaction').length, 2);
  assert.ok(f.calls.every(x => ['getblockchaininfo', 'getrawtransaction', 'getblockheader', 'getblockhash'].includes(x.method)));
});

test('Bitcoin output is matched by canonical index and converted to satoshis', async () => {
  const f = fixture();
  const result = await f.verify({ ...order, rail: 'BTC', asset: 'BTC' }, reference);
  assert.equal(result.amountAtomic, '250000000');
  assert.equal(f.paths.length, 0);
  f.tx.vout[0].value = 0.00000001;
  assert.equal((await f.verify({ ...order, rail: 'BTC', asset: 'BTC', amountAtomic: '1' }, reference)).amountAtomic, '1');
  f.tx.vout[0].value = 0.000000001;
  await assert.rejects(f.verify({ ...order, rail: 'BTC', asset: 'BTC', amountAtomic: '1' }, reference), /invalid_btc_precision/);
});

test('wrong networks, unsynchronized nodes and orphaned transactions fail closed', async () => {
  const mutations = [
    f => { f.chain.chain = 'test'; }, f => { f.chain.initialblockdownload = true; },
    f => { f.chain.headers++; }, f => { f.tx.confirmations = 0; },
    f => { f.tx.txid = 'ef'.repeat(32); }, f => { f.header.confirmations = -1; },
    f => { f.activeHash = 'ef'.repeat(32); }, f => { f.status.network = 'testnet'; },
    f => { f.status.server_ready = false; }, f => { f.status.counterparty_height--; },
    f => { f.block.block_hash = 'ef'.repeat(32); }, f => { f.block.block_index--; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    await assert.rejects(f.verify(order, reference), /payment_verifier:/);
  }
});

test('invalid, mismatched, ambiguous and unsafe Counterparty quantities are rejected', async () => {
  const mutations = [
    f => { f.sends[0].status = 'invalid'; }, f => { f.sends[0].destination = 'wrong'; },
    f => { f.sends[0].asset = 'XCP'; }, f => { f.sends[0].tx_hash = 'ef'.repeat(32); },
    f => { f.sends[0].block_index--; }, f => { delete f.sends[0].asset_info; },
    f => { f.sends[0].quantity = 249999999; }, f => { f.sends[0].quantity = Number.MAX_SAFE_INTEGER + 1; },
    f => { f.sends[0].quantity = '2.5'; }, f => { f.sends[0].quantity = undefined; f.sends[0].quantity_normalized = '999'; },
    f => { f.sends.push({ ...f.sends[0], destination: 'other-output' }); },
    f => { f.sends[0].msg_index = 1; },
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f);
    await assert.rejects(f.verify(order, reference), /payment_verifier:/);
  }
});

test('indivisible token quantity stays in raw atomic units', async () => {
  const f = fixture();
  f.sends[0].asset_info.divisible = false;
  f.sends[0].quantity = 1;
  assert.equal((await f.verify({ ...order, amountAtomic: '1' }, reference)).amountAtomic, '1');
});

test('final shared verifier rejects a reorg during observation', async () => {
  const f = fixture();
  const rpc = async (...args) => {
    const result = await f.rpc(...args);
    if (args[0] === 'getrawtransaction' && f.calls.filter(x => x.method === 'getrawtransaction').length === 2) return { ...result, blockhash: 'ef'.repeat(32) };
    return result;
  };
  const verify = createCheckoutPaymentVerifier({ rpc, counterpartyGet: f.counterpartyGet, now });
  await assert.rejects(verify(order, reference), /bitcoin_inclusion_changed/);
});

test('RPC failures and missing dependencies never fabricate confirmation', async () => {
  assert.throws(() => createCheckoutPaymentVerifier(), /trusted_bitcoin_rpc_required/);
  const f = fixture();
  await assert.rejects(createCheckoutPaymentVerifier({ rpc: f.rpc, now })(order, reference), /trusted_counterparty_reader_required/);
  await assert.rejects(createCheckoutPaymentVerifier({ rpc: async () => { throw new Error('node unavailable'); } })(order, reference), /node unavailable/);
});

test('fixed HTTPS reader rejects arbitrary paths, redirects by policy, errors and pagination', async () => {
  for (const baseUrl of ['http://node/v2', 'https://user:password@node/v2', 'https://node/v2?target=other']) {
    assert.throws(() => createCounterpartyPaymentReader({ baseUrl }), /invalid_counterparty_base/);
  }
  let requested;
  let body = { result: [] };
  let ok = true;
  const read = createCounterpartyPaymentReader({ baseUrl: 'https://node.example/v2', fetchImpl: async (url, options) => {
    requested = { url, options }; return { ok, json: async () => body };
  } });
  assert.deepEqual(await read(`transactions/${txid}/sends?limit=1000&verbose=true`), []);
  assert.equal(requested.url, `https://node.example/v2/transactions/${txid}/sends?limit=1000&verbose=true`);
  assert.equal(requested.options.method, 'GET');
  assert.equal(requested.options.redirect, 'error');
  await assert.rejects(read('https://evil.example'), /unsupported_counterparty_read/);
  body = { result: [], next_cursor: 42 };
  await assert.rejects(read(''), /pagination_required/);
  body = { error: 'unavailable' };
  await assert.rejects(read(''), /invalid_counterparty_response/);
  ok = false;
  await assert.rejects(read(''), /counterparty_unavailable/);
});

test('verified Counterparty observation flows through durable order allocation and rejects reuse', async () => {
  const f = fixture();
  let clock = new Date('2026-11-08T00:00:00.000Z');
  const store = createStore(':memory:', { paymentVerifier: f.verify, now: () => clock });
  try {
    store.paymentAllocations.registerOrder(order);
    store.paymentAllocations.registerOrder({ ...order, orderId: 'second-sale' });
    clock = now();
    const result = await store.paymentAllocations.allocate({ merchantId: order.merchantId, orderId: order.orderId, ...reference });
    assert.equal(result.destination, order.destination);
    assert.equal(result.amountAtomic, order.amountAtomic);
    await assert.rejects(store.paymentAllocations.allocate({ merchantId: order.merchantId, orderId: 'second-sale', ...reference }), /payment_already_allocated/);
  } finally { store.close(); }
});
