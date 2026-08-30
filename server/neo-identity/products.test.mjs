import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapProductFounder, getProductFounderBinding, assertProductFounderInvariant } from './products.mjs';
import { authorizeBankingAction, mapExternalCesAccount } from './banking-authority.mjs';

const products=['neopay','neo-prime','noogle','omnitrix','neo-telegram','neogram','neo-wire','neo-counter','neo-teller','neo-device-registry','neo-exchange','neofx','neo-dex','nibiru-reserve','neo-bank','neo-ces','neo-treasury'];

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

test('market bindings do not create trading custody settlement or admin bypasses', () => {
  const exchange = getProductFounderBinding('neo-exchange');
  const fx = getProductFounderBinding('neofx');
  const dex = getProductFounderBinding('neo-dex');
  for (const binding of [exchange,fx,dex]) {
    assert.equal(binding.order_signing_bypass, false);
    assert.equal(binding.custody_bypass, false);
    assert.equal(binding.market_admin_bypass, false);
  }
  assert.equal(exchange.settlement_bypass, false);
  assert.equal(exchange.wallet_secrets_in_registry, false);
  assert.equal(fx.pricing_override_bypass, false);
  assert.equal(dex.settlement_bypass, false);
  assert.equal(dex.listing_approval_bypass, false);
});

test('banking and reserve bindings do not create issuance custody treasury or CES bypasses', () => {
  const reserve=getProductFounderBinding('nibiru-reserve');
  const bank=getProductFounderBinding('neo-bank');
  const ces=getProductFounderBinding('neo-ces');
  const treasury=getProductFounderBinding('neo-treasury');
  assert.equal(reserve.reserve_custody_bypass,false);
  assert.equal(reserve.issuance_authority_bypass,false);
  assert.equal(reserve.treasury_transfer_bypass,false);
  assert.equal(reserve.signing_secrets_in_registry,false);
  assert.equal(bank.transaction_approval_bypass,false);
  assert.equal(bank.vdollar_issuance_bypass,false);
  assert.equal(bank.ces_admin_bypass,false);
  assert.equal(bank.bank_account_impersonation,false);
  assert.equal(bank.credentials_in_registry,false);
  assert.equal(ces.external_account_override,false);
  assert.equal(ces.transaction_approval_bypass,false);
  assert.equal(ces.issuance_bypass,false);
  assert.equal(ces.credentials_in_registry,false);
  assert.equal(treasury.custody_bypass,false);
  assert.equal(treasury.transfer_approval_bypass,false);
  assert.equal(treasury.signing_bypass,false);
  assert.equal(treasury.private_keys_in_registry,false);
});

test('founder ownership alone cannot authorize banking value movement', () => {
  const denied=authorizeBankingAction('neo-bank','bank.vdollar.issue',{subjectId:'neo:founder:000001',authenticated:true});
  assert.equal(denied.allowed,false);
  const allowed=authorizeBankingAction('neo-bank','bank.vdollar.issue',{subjectId:'neo:founder:000001',authenticated:true,vdollarIssuanceAuthorized:true,stepUpVerified:true});
  assert.equal(allowed.allowed,true);
});

test('external CES accounts require verified mapping and never override native numbering', () => {
  assert.throws(()=>mapExternalCesAccount({exchangeId:'NMNI',externalAccount:'NMNI0000'}),/verified/);
  const mapping=mapExternalCesAccount({exchangeId:'NMNI',externalAccount:'NMNI0000',verified:true});
  assert.equal(mapping.subjectId,'neo:founder:000001');
  assert.equal(mapping.nativeOrdinalOverride,false);
  assert.equal(mapping.credentialsStored,false);
});
