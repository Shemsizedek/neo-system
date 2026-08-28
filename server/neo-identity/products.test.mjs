import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapProductFounder, getProductFounderBinding, assertProductFounderInvariant } from './products.mjs';

for (const productId of ['neopay','neo-prime']) {
  test(`${productId} reserves canonical founder as account #1`, () => {
    const binding = getProductFounderBinding(productId);
    assert.equal(binding.subjectId, 'neo:founder:000001');
    assert.equal(binding.account_ordinal, 1);
    assert.equal(binding.authentication_bypass, false);
    const result = bootstrapProductFounder(productId, []);
    assert.equal(result.founder.accountOrdinal, 1);
    assert.equal(result.founder.subjectId, 'neo:founder:000001');
    assert.equal(result.founder.authenticationBypass, false);
    assert.equal(assertProductFounderInvariant(productId, result.records), true);
  });
}

test('product bootstrap is idempotent', () => {
  const first = bootstrapProductFounder('neopay', []);
  const second = bootstrapProductFounder('neopay', first.records);
  assert.equal(second.created, false);
  assert.equal(second.records.length, 1);
});

test('account #1 cannot be occupied by another principal', () => {
  assert.throws(() => bootstrapProductFounder('neo-prime', [{productId:'neo-prime', accountOrdinal:1, subjectId:'neo:user:000002'}]), /occupied/);
});
