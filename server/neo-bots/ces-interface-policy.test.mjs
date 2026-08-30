import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCesInterface, isLegacyCritical } from './ces-interface-policy.mjs';

test('legacy is the default CES interface', () => {
  assert.equal(resolveCesInterface('ces.transactions.review'), 'legacy');
  assert.equal(resolveCesInterface('ces.virtual-trader.review'), 'legacy');
});

test('modern interface is allowed for smaller read jobs', () => {
  assert.equal(resolveCesInterface('ces.transactions.review', 'modern'), 'modern');
  assert.equal(resolveCesInterface('ces.virtual-trader.review', 'modern'), 'modern');
});

test('modern interface is blocked for transaction approval and V-Dollar issuance', () => {
  assert.throws(() => resolveCesInterface('ces.transactions.approve', 'modern'), /legacy interface required/);
  assert.throws(() => resolveCesInterface('ces.vdollars.issue', 'modern'), /legacy interface required/);
  assert.equal(isLegacyCritical('ces.transactions.approve'), true);
  assert.equal(isLegacyCritical('ces.vdollars.issue'), true);
});
