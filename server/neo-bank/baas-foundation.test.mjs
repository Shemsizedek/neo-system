import test from 'node:test';
import assert from 'node:assert/strict';
import {BAAS_MODE, requireTenant, parseMinorUnits, planSyntheticJournal,
  validateBalancedJournal, disabledBankingProvider} from './baas-foundation.mjs';

const actor = {authenticated:true, tenantId:'tenant_144', scopes:['ledger:simulate']};
const valid = () => planSyntheticJournal({
  actor, tenantId:'tenant_144', debitAccount:'asset_cash', creditAccount:'liability_customer',
  amountMinor:'100005', currency:'USD', idempotencyKey:'request_000001'
});

test('BaaS foundation is synthetic-only and journals are balanced', () => {
  const journal = valid();
  assert.equal(journal.mode, BAAS_MODE);
  assert.equal(validateBalancedJournal(journal), true);
  assert.equal(journal.entries[0].amountMinor,'100005');
  assert.equal(journal.entries[1].amountMinor,'100005');
  assert.equal(Object.isFrozen(journal),true);
});

test('tenant and scope isolation deny cross-tenant and unauthenticated access', () => {
  assert.throws(() => requireTenant(actor,'tenant_999','ledger:simulate'),/tenant_authorization_required/);
  assert.throws(() => requireTenant({...actor,authenticated:false},'tenant_144','ledger:simulate'),/tenant_authorization_required/);
  assert.throws(() => requireTenant({...actor,scopes:[]},'tenant_144','ledger:simulate'),/tenant_authorization_required/);
});

test('minor units reject floats, exponent notation, zero and unsafe integers', () => {
  for(const value of ['1.25','1e3','0','-1','9007199254740992',100,'01']) {
    assert.throws(() => parseMinorUnits(value),/invalid_minor_units/);
  }
  assert.equal(parseMinorUnits('9007199254740991'),9007199254740991n);
});

test('journal never permits same-account entries or malformed idempotency keys', () => {
  assert.throws(() => planSyntheticJournal({
    actor,tenantId:'tenant_144',debitAccount:'same_acc',creditAccount:'same_acc',
    amountMinor:'1',currency:'USD',idempotencyKey:'request_000001'
  }),/invalid_accounts/);
  assert.throws(() => planSyntheticJournal({
    actor,tenantId:'tenant_144',debitAccount:'asset_cash',creditAccount:'customer_x',
    amountMinor:'1',currency:'USD',idempotencyKey:'short'
  }),/invalid_idempotency_key/);
});

test('unbalanced journals are rejected', () => {
  const bad = {...valid(),entries:[
    {accountId:'asset_cash',direction:'debit',amountMinor:'100'},
    {accountId:'liability_customer',direction:'credit',amountMinor:'99'}
  ]};
  assert.throws(() => validateBalancedJournal(bad),/unbalanced_journal/);
});

test('all regulated provider actions fail closed', async () => {
  for (const action of Object.values(disabledBankingProvider())) {
    await assert.rejects(action(),/banking_provider_not_authorized/);
  }
});
