import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapProductFounder, getProductFounderBinding, assertProductFounderInvariant } from './products.mjs';

const products=['neopay','neo-prime','noogle','omnitrix','neo-telegram','neogram','neo-wire','neo-counter','neo-teller','neo-device-registry'];

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

test('transaction and device bindings do not create money-movement or hardware bypasses', () => {
  const counter = getProductFounderBinding('neo-counter');
  const teller = getProductFounderBinding('neo-teller');
  const devices = getProductFounderBinding('neo-device-registry');
  assert.equal(counter.transaction_approval_bypass, false);
  assert.equal(counter.terminal_authentication_bypass, false);
  assert.equal(counter.payment_credential_storage, false);
  assert.equal(teller.cash_dispense_bypass, false);
  assert.equal(teller.transaction_approval_bypass, false);
  assert.equal(teller.device_enrollment_bypass, false);
  assert.equal(teller.payment_credential_storage, false);
  assert.equal(devices.device_attestation_bypass, false);
  assert.equal(devices.device_enrollment_bypass, false);
  assert.equal(devices.private_device_keys_in_registry, false);
});
