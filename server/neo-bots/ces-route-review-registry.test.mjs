import test from 'node:test';
import assert from 'node:assert/strict';
import { createCesRouteReviewRegistry, buildTrustedLegacyRouteSet } from './ces-route-review-registry.mjs';

const candidate = Object.freeze({
  surface: 'stats',
  path: '/win/stats.asp',
  url: 'https://www.community-exchange.org/win/stats.asp',
  text: 'Stats',
  score: 90,
  confidence: 'high',
  evidence: ['stats'],
  status: 'quarantined',
  trusted: false,
});

test('approved review is persisted but not trusted until promotion', () => {
  const registry = createCesRouteReviewRegistry();
  const reviewed = registry.review({ exchangeId: 'NMNI', candidate, approved: true, reviewer: 'admin-approval' });
  assert.equal(reviewed.decision, 'approved');
  assert.equal(reviewed.promoted, null);
  assert.equal(registry.listPromoted('NMNI').length, 0);
});

test('rejected route cannot be promoted', () => {
  const registry = createCesRouteReviewRegistry();
  registry.review({ exchangeId: 'NMNI', candidate, approved: false, reviewer: 'admin-approval', note: 'wrong page' });
  assert.throws(() => registry.promote({ exchangeId: 'NMNI', surface: 'stats' }), /not approved/);
});

test('promoted route is exposed in trusted legacy route set with review record', () => {
  const registry = createCesRouteReviewRegistry();
  registry.review({ exchangeId: 'NMNI', candidate, approved: true, reviewer: 'admin-approval', note: 'verified against legacy panel' });
  registry.promote({ exchangeId: 'NMNI', surface: 'stats' });
  const trusted = buildTrustedLegacyRouteSet({ exchangeId: 'NMNI', registry });
  assert.equal(trusted.stats.trusted, true);
  assert.equal(trusted.stats.path, '/win/stats.asp');
  assert.equal(trusted.stats.reviewRecord.reviewer, 'admin-approval');
});
