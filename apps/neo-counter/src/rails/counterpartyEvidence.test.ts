import assert from 'node:assert/strict';
import { matchCounterpartyReceive } from './counterpartyEvidence';

const expected = { address: 'synthetic-merchant', asset: 'NOMNI', expectedAmount: 2.5, startedAt: '2026-11-08T00:00:00Z' };
const valid = { destination: expected.address, asset: expected.asset, quantity_normalized: '2.50000000', block_time: 1794096001, block_index: 900001, tx_hash: 'ab'.repeat(32), status: 'valid' };
assert.equal(matchCounterpartyReceive(valid, expected)?.reference, valid.tx_hash);
assert.equal(matchCounterpartyReceive({ ...valid, block_time: '2026-11-08T00:00:01Z' }, expected)?.amount, 2.5);
assert.equal(matchCounterpartyReceive({ ...valid, quantity_normalized: '3' }, expected)?.amount, 3);

const rejected: unknown[] = [
  null, [],
  { ...valid, destination: 'another-merchant' },
  { ...valid, asset: 'XCP' },
  { ...valid, block_time: undefined },
  { ...valid, block_time: 'invalid' },
  { ...valid, block_time: '2026-11-08T00:00:01' },
  { ...valid, block_time: 1794095999 },
  { ...valid, block_index: 0 },
  { ...valid, block_index: '900001' },
  { ...valid, status: 'invalid: insufficient funds' },
  { ...valid, tx_hash: undefined, event_index: 123, tx_hash_index: 'event-123' },
  { ...valid, tx_hash: 'not-a-transaction' },
  { ...valid, quantity_normalized: undefined, quantity: 250000000 },
  ...['2.49999999', 'Infinity', '-3', '0', '2.500000001', '2.5junk', '2.5e0', '', true, Infinity, NaN].map(quantity_normalized => ({ ...valid, quantity_normalized })),
];
for (const row of rejected) assert.equal(matchCounterpartyReceive(row, expected), null, JSON.stringify(row));
for (const expectedAmount of [0, -1, NaN, Infinity, 0.000000001]) {
  assert.equal(matchCounterpartyReceive(valid, { ...expected, expectedAmount }), null);
}
assert.equal(matchCounterpartyReceive(valid, { ...expected, startedAt: 'invalid' }), null);
assert.equal(matchCounterpartyReceive({ ...valid, quantity_normalized: '0.00000001' }, { ...expected, expectedAmount: 0.00000001 })?.amount, 0.00000001);
console.log(`Counterparty evidence checks passed (${rejected.length} rejected row fixtures plus expected-input and positive cases)`);
