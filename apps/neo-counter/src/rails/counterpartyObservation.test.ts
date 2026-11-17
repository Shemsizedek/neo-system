import assert from 'node:assert/strict';
import { test } from 'node:test';
import { observeCounterpartyReceives } from './counterpartyObservation.js';

const now = Date.parse('2026-11-17T02:00:30Z');
const input = { address: 'merchant-address', asset: 'NOMNI', expectedAmount: 1, startedAt: '2026-11-17T02:00:00Z', now };
const node = { result: { server_ready: true, network: 'mainnet', counterparty_height: 976205 } };
const receipt = { asset: 'NOMNI', destination: input.address, status: 'valid', block_time: now / 1000 - 10,
  block_index: 976205, tx_hash: 'a'.repeat(64), quantity: 1, quantity_normalized: '1', asset_info: { divisible: false } };
const observe = (row: object, overrides = {}, state: unknown = node) =>
  observeCounterpartyReceives({ result: [row] }, state, { ...input, ...overrides });
const noPayment = (value: ReturnType<typeof observe>) => assert.equal(value.detected, false);

test('valid recent verbose receipt has a confirmed transaction reference', () => {
  assert.deepEqual(observe(receipt), { detected: true, confirmed: true, reference: receipt.tx_hash, amount: 1, source: 'Counterparty API v2' });
});
test('historical real API shape without block_time cannot pay a new order', () => {
  noPayment(observe({ asset: 'NOMNI', destination: input.address, status: 'valid', block_index: 626578,
    tx_hash: 'a1f0356b05053bdb79edb284031645bf77e3627273b88b6cf020919a4ae0c680', quantity: 1 }));
});
test('historical Unix-seconds receipt fails freshness check', () => noPayment(observe({ ...receipt, block_time: 1587229736 })));
test('timestamp parser handles numeric seconds, numeric strings and ISO values', () => {
  for (const block_time of [receipt.block_time, String(receipt.block_time), new Date(receipt.block_time * 1000).toISOString()]) {
    assert.equal(observe({ ...receipt, block_time }).confirmed, true);
  }
});
test('missing, invalid or future timestamps fail closed', () => {
  for (const block_time of [undefined, null, '', 'not-a-date', now / 1000 + 1]) noPayment(observe({ ...receipt, block_time }));
});
test('invalid order time and nonpositive amounts fail closed', () => {
  for (const startedAt of ['', 'invalid', new Date(now + 1).toISOString()]) noPayment(observe(receipt, { startedAt }));
  for (const expectedAmount of [0, -1, NaN, Infinity]) noPayment(observe(receipt, { expectedAmount }));
});
test('asset, destination and valid status must all match', () => {
  for (const row of [{ ...receipt, asset: 'XCP' }, { ...receipt, destination: 'other-address' },
    { ...receipt, status: 'invalid' }, { ...receipt, status: undefined }]) noPayment(observe(row));
});
test('block inclusion must fit the ready mainnet node height', () => {
  for (const block_index of [undefined, 0, -1, 1.5, 976206]) noPayment(observe({ ...receipt, block_index }));
  for (const result of [{ ...node.result, server_ready: false }, { ...node.result, network: 'testnet' },
    { ...node.result, counterparty_height: undefined }, { ...node.result, counterparty_height: 0 }]) noPayment(observe(receipt, {}, { result }));
});
test('only full transaction hashes count as settlement references', () => {
  for (const tx_hash of [undefined, '', 'event-123', 'a'.repeat(63)]) noPayment(observe({ ...receipt, tx_hash }));
});
test('normalized underpayment and malformed quantities cannot settle', () => {
  for (const quantity_normalized of ['0', '0.5', '-1', 'Infinity', 'NaN', '2.5']) noPayment(observe({ ...receipt, quantity_normalized }));
});
test('raw divisible quantities require metadata and normalization', () => {
  const row = { ...receipt, asset: 'XCP', quantity_normalized: undefined, quantity: 100_000_000, asset_info: { divisible: true } };
  assert.equal(observe(row, { asset: 'XCP' }).amount, 1);
  noPayment(observe(row, { asset: 'XCP', expectedAmount: 2 }));
  noPayment(observe({ ...row, asset_info: undefined }, { asset: 'XCP' }));
});
test('missing payloads and malformed entries do not settle', () => {
  for (const payload of [null, {}, { result: null }, { result: [null, {}, 'bad'] }])
    noPayment(observeCounterpartyReceives(payload, node, input));
});
