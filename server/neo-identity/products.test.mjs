import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapProductFounder, getProductFounderBinding, assertProductFounderInvariant } from './products.mjs';

const products=['neopay','neo-prime','noogle','omnitrix','neo-telegram','neogram','neo-wire'];

for (const productId of products) {
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
  for (const productId of products) {
    const first = bootstrapProductFounder(productId, []);
    const second = bootstrapProductFounder(productId, first.records);
    assert.equal(second.created, false);
    assert.equal(second.records.length, 1);
  }
});

test('account #1 cannot be occupied by another principal', () => {
  for (const productId of products) {
    assert.throws(() => bootstrapProductFounder(productId, [{productId, accountOrdinal:1, subjectId:'neo:user:000002'}]), /occupied/);
  }
});

test('communications bindings do not create privilege bypasses', () => {
  const telegram = getProductFounderBinding('neo-telegram');
  const neogram = getProductFounderBinding('neogram');
  const wire = getProductFounderBinding('neo-wire');
  assert.equal(telegram.message_signing_bypass, false);
  assert.equal(telegram.channel_permission_bypass, false);
  assert.equal(neogram.message_signing_bypass, false);
  assert.equal(neogram.mailbox_access_bypass, false);
  assert.equal(wire.network_authority_bypass, false);
  assert.equal(wire.device_enrollment_bypass, false);
});
