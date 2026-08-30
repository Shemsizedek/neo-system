import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CES_LEGACY_PROFILE,
  getLegacyCesSurface,
  getLegacyCesRoute,
  listLegacyDiscoveryTargets,
} from './ces-legacy-profile.mjs';

test('legacy CES exposes named admin surfaces', () => {
  assert.equal(getLegacyCesSurface('transactions').label, 'Transactions');
  assert.equal(getLegacyCesSurface('virtual-trader').mapping, 'mapped');
  assert.equal(CES_LEGACY_PROFILE.default, true);
});

test('legacy discovery map includes all required control-panel surfaces', () => {
  const targets = listLegacyDiscoveryTargets();
  const keys = targets.map((target) => target.key);
  for (const key of ['login','transactions','offerings','publications','memberships','manage','stats','virtual-trader']) {
    assert.ok(keys.includes(key), `missing legacy CES discovery target: ${key}`);
  }
});

test('financial write routes remain guarded until discovered', () => {
  const approval = getLegacyCesRoute('transaction-approval');
  const issuance = getLegacyCesRoute('v-dollar-issue');
  assert.equal(approval.mode, 'guarded');
  assert.equal(approval.requiresHumanApproval, true);
  assert.equal(approval.requiresFingerprint, true);
  assert.equal(issuance.mode, 'guarded');
  assert.equal(issuance.requiresHumanApproval, true);
});

test('known Virtual Trader route remains mapped read-only', () => {
  const route = getLegacyCesRoute('virtual-trader');
  assert.equal(route.path, '/win/virtual.asp');
  assert.equal(route.method, 'GET');
  assert.equal(route.mode, 'read-only');
});
