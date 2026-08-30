import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CES_LEGACY_PROFILE,
  getLegacyCesRoute,
  assertLegacyRouteReady,
  registerDiscoveredLegacyRoute,
} from './ces-legacy-profile.mjs';

test('legacy CES is the default profile and virtual trader route is known', () => {
  assert.equal(CES_LEGACY_PROFILE.default, true);
  const route = getLegacyCesRoute('virtual-trader');
  assert.equal(route.path, '/win/virtual.asp');
  assert.equal(route.mode, 'read-only');
});

test('undiscovered write route is blocked', () => {
  assert.throws(() => assertLegacyRouteReady('transaction-approval', { fingerprint: 'abc' }), /requires discovery/);
});

test('discovered write route requires a reviewed fingerprint', () => {
  assert.throws(
    () => registerDiscoveredLegacyRoute(CES_LEGACY_PROFILE, 'transaction-approval', { path: '/legacy/approve.asp' }),
    /reviewed fingerprint/,
  );
  const discovered = registerDiscoveredLegacyRoute(CES_LEGACY_PROFILE, 'transaction-approval', {
    path: '/legacy/approve.asp',
    fingerprint: 'fnv1a-demo',
  });
  assert.equal(discovered.path, '/legacy/approve.asp');
  assert.equal(discovered.fingerprint, 'fnv1a-demo');
});
