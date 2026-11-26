import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.mjs';
import { createPaymentAllocationStore } from './payment-allocation.mjs';

const txid = 'ab'.repeat(32);
const order = (orderId = 'order-a', merchantId = 'merchant-a') => ({ merchantId, orderId, network: 'bitcoin-mainnet', rail: 'COUNTERPARTY', asset: 'NOMNI', destination: 'synthetic-vendor', amountAtomic: '250000000', minConfirmations: 2, expiresAt: '2026-11-08T00:05:00.000Z' });
const evidence = (expected, ref) => ({ ...expected, ...ref, confirmed: true, confirmations: 2, blockHash: 'cd'.repeat(32), blockTime: '2026-11-08T00:00:30.000Z' });
const request = (orderId = 'order-a', merchantId = 'merchant-a') => ({ merchantId, orderId, txid, eventIndex: 0 });
const code = expected => error => error.code === expected;
function fixture(verifier = evidence) {
  let clock = new Date('2026-11-08T00:00:00.000Z');
  const store = createStore(':memory:', { paymentVerifier: verifier, now: () => clock });
  store.paymentAllocations.registerOrder(order());
  clock = new Date('2026-11-08T00:01:00.000Z');
  return { store, allocations: store.paymentAllocations, setClock: value => { clock = new Date(value); } };
}

test('allocation requires an explicit trusted verifier and leaves ordinary stores disabled', () => {
  const store = createStore(':memory:');
  try {
    assert.equal(store.paymentAllocations, null);
    assert.throws(() => createPaymentAllocationStore(store.db), code('trusted_payment_verifier_required'));
  } finally { store.close(); }
});

test('same-order retries are idempotent, normalize hash casing and reverify evidence', async () => {
  let calls = 0;
  const f = fixture((o, r) => { calls++; assert.ok(Object.isFrozen(o)); assert.ok(Object.isFrozen(r)); return evidence(o, r); });
  try {
    const first = await f.allocations.allocate(request());
    const retry = await f.allocations.allocate({ ...request(), txid: txid.toUpperCase() });
    assert.deepEqual(retry, first);
    assert.equal(calls, 2);
    assert.equal(f.store.db.prepare('SELECT count(*) n FROM payment_allocations').get().n, 1);
    await assert.rejects(f.allocations.allocate({ ...request(), txid: 'ef'.repeat(32) }), code('order_already_allocated'));
  } finally { f.store.close(); }
});

test('payment cannot be reassigned to another order or merchant', async () => {
  const f = fixture();
  try {
    f.setClock('2026-11-08T00:00:00.000Z');
    f.allocations.registerOrder(order('order-b'));
    f.allocations.registerOrder(order('order-c', 'merchant-b'));
    f.setClock('2026-11-08T00:01:00.000Z');
    await f.allocations.allocate(request());
    for (const args of [request('order-b'), request('order-c', 'merchant-b')]) {
      await assert.rejects(f.allocations.allocate(args), code('payment_already_allocated'));
    }
  } finally { f.store.close(); }
});

test('immutable authoritative orders reject overwrite and invalid inputs', () => {
  const f = fixture();
  try {
    assert.equal(f.allocations.registerOrder(order()).orderId, 'order-a');
    assert.throws(() => f.allocations.registerOrder({ ...order(), destination: 'another-vendor' }), code('payment_order_conflict'));
    for (const change of [{ amountAtomic: '2.5' }, { amountAtomic: '0' }, { minConfirmations: 0 }, { network: 'ethereum' }, { rail: 'BTC' }, { expiresAt: 'invalid' }]) {
      assert.throws(() => f.allocations.registerOrder({ ...order('invalid'), ...change }), code('invalid_payment_order'));
    }
  } finally { f.store.close(); }
});

test('wrong, stale, incomplete and insufficient evidence never consumes a payment', async () => {
  const bad = [
    { network: 'bitcoin-testnet' }, { rail: 'BTC' }, { asset: 'XCP' }, { destination: 'wrong' },
    { amountAtomic: '249999999' }, { amountAtomic: 'Infinity' }, { amountAtomic: 250000000 },
    { confirmed: false }, { confirmations: 1 }, { confirmations: NaN },
    { txid: 1 }, { txid: 'ef'.repeat(32) }, { eventIndex: 1 }, { blockHash: '' },
    { blockTime: '2026-11-07T23:59:59.000Z' }, { blockTime: '2026-11-08T00:02:00.000Z' }, { blockTime: 'invalid' },
  ];
  for (const change of bad) {
    const f = fixture((o, r) => ({ ...evidence(o, r), ...change }));
    try {
      await assert.rejects(f.allocations.allocate(request()), code('payment_evidence_rejected'));
      assert.equal(f.store.db.prepare('SELECT count(*) n FROM payment_allocations').get().n, 0);
    } finally { f.store.close(); }
  }
});

test('verifier failures, malformed references and unknown orders do not allocate', async () => {
  const f = fixture(() => { throw new Error('node_unavailable'); });
  try {
    await assert.rejects(f.allocations.allocate(request()), /node_unavailable/);
    await assert.rejects(f.allocations.allocate({ ...request(), eventIndex: -1 }), code('invalid_payment_reference'));
    await assert.rejects(f.allocations.allocate(request('missing')), code('payment_order_not_found'));
    assert.equal(f.store.db.prepare('SELECT count(*) n FROM payment_allocations').get().n, 0);
  } finally { f.store.close(); }
});

test('expiry during verification fails; retries after expiry reverify, and changed chain evidence is rejected', async () => {
  let clock = new Date('2026-11-08T00:00:00.000Z');
  let expiresDuringVerification = true;
  let override = {};
  const store = createStore(':memory:', { now: () => clock, paymentVerifier: (o, r) => {
    if (expiresDuringVerification) clock = new Date('2026-11-08T00:05:00.000Z');
    return { ...evidence(o, r), ...override };
  } });
  try {
    store.paymentAllocations.registerOrder(order());
    await assert.rejects(store.paymentAllocations.allocate(request()), code('payment_order_expired'));
    expiresDuringVerification = false;
    clock = new Date('2026-11-08T00:01:00.000Z');
    const allocation = await store.paymentAllocations.allocate(request());
    clock = new Date('2026-11-08T00:06:00.000Z');
    assert.deepEqual(await store.paymentAllocations.allocate(request()), allocation);
    override = { confirmed: false };
    await assert.rejects(store.paymentAllocations.allocate(request()), code('payment_evidence_rejected'));
    override = { blockHash: 'ef'.repeat(32) };
    await assert.rejects(store.paymentAllocations.allocate(request()), code('payment_evidence_changed'));
  } finally { store.close(); }
});

test('two database connections racing for a payment produce one durable winner', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'neo-allocation-'));
  const path = join(dir, 'counter.sqlite');
  let clock = new Date('2026-11-08T00:00:00.000Z');
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const options = { now: () => clock, paymentVerifier: async (o, r) => { await barrier; return evidence(o, r); } };
  const a = createStore(path, options), b = createStore(path, options);
  try {
    a.paymentAllocations.registerOrder(order());
    b.paymentAllocations.registerOrder(order('order-b'));
    clock = new Date('2026-11-08T00:01:00.000Z');
    const attempts = [a.paymentAllocations.allocate(request()), b.paymentAllocations.allocate(request('order-b'))];
    release();
    const results = await Promise.allSettled(attempts);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.code, 'payment_already_allocated');
    assert.equal(a.db.prepare('SELECT count(*) n FROM payment_allocations').get().n, 1);
  } finally { a.close(); b.close(); }
  const reopened = createStore(path, { ...options, paymentVerifier: evidence });
  try {
    assert.equal((await reopened.paymentAllocations.allocate(request())).orderId, 'order-a');
    await assert.rejects(reopened.paymentAllocations.allocate(request('order-b')), code('payment_already_allocated'));
  } finally { reopened.close(); rmSync(dir, { recursive: true, force: true }); }
});
