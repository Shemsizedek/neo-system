import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLegacyRouteCandidates,
  reviewLegacyRouteCandidate,
  promoteLegacyRouteCandidate,
} from './ces-legacy-route-candidates.mjs';

test('candidate generator scores known legacy surfaces from discovered links', () => {
  const manifest = {
    discoveredLinks: [
      { text: 'Transactions', path: '/win/transactions.asp', url: 'https://www.community-exchange.org/win/transactions.asp' },
      { text: 'System Stats and Reports', path: '/win/stats.asp', url: 'https://www.community-exchange.org/win/stats.asp' },
      { text: 'Virtual Trader', path: '/win/virtual.asp', url: 'https://www.community-exchange.org/win/virtual.asp' },
    ],
  };

  const candidates = generateLegacyRouteCandidates(manifest);
  assert.ok(candidates.some((candidate) => candidate.surface === 'transactions' && candidate.path === '/win/transactions.asp'));
  assert.ok(candidates.some((candidate) => candidate.surface === 'stats' && candidate.path === '/win/stats.asp'));
  const virtual = candidates.find((candidate) => candidate.surface === 'virtual-trader');
  assert.equal(virtual.confidence, 'high');
  assert.equal(virtual.status, 'quarantined');
  assert.equal(virtual.trusted, false);
});

test('promotion is blocked until an explicit human review approves the candidate', () => {
  const [candidate] = generateLegacyRouteCandidates({
    discoveredLinks: [
      { text: 'Offerings', path: '/win/offers.asp', url: 'https://www.community-exchange.org/win/offers.asp' },
    ],
  });

  assert.throws(() => promoteLegacyRouteCandidate(candidate), /reviewed and approved/);
  const rejected = reviewLegacyRouteCandidate(candidate, { approved: false, reviewer: 'admin-review' });
  assert.throws(() => promoteLegacyRouteCandidate(rejected), /reviewed and approved/);
  const approved = reviewLegacyRouteCandidate(candidate, { approved: true, reviewer: 'admin-review', note: 'matched legacy Offerings page' });
  const promoted = promoteLegacyRouteCandidate(approved);
  assert.equal(promoted.trusted, true);
  assert.equal(promoted.surface, 'offerings');
});
