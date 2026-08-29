import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrustedLegacyProfile } from './ces-legacy-profile.mjs';

test('trusted legacy profile consumes promoted reviewed route', () => {
  const profile = createTrustedLegacyProfile({
    exchangeId: 'NMNI',
    trustedRoutes: {
      stats: {
        trusted: true,
        path: '/win/stats.asp',
        source: 'discovery-manifest',
        confidence: 'high',
        score: 90,
        reviewRecord: { reviewer: 'admin-approval', reviewedAt: '2026-08-29T00:00:00.000Z' },
      },
    },
  });
  assert.equal(profile.exchangeId, 'NMNI');
  assert.equal(profile.routes.statsRead.path, '/win/stats.asp');
  assert.equal(profile.routes.statsRead.discovery.reviewer, 'admin-approval');
});

test('unreviewed promotion is rejected', () => {
  assert.throws(() => createTrustedLegacyProfile({
    exchangeId: 'NMNI',
    trustedRoutes: { stats: { trusted: true, path: '/win/stats.asp' } },
  }), /untrusted CES legacy promotion/);
});
