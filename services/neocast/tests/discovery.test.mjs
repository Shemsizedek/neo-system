import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDiscovery, loadCanonicalDiscovery, planOfficialLaunch } from '../discovery.mjs';

const registry = JSON.parse(readFileSync(new URL('../../../docs/neo-tv/data/public-tv-providers.json', import.meta.url), 'utf8'));
const policy = JSON.parse(readFileSync(new URL('../../../docs/neocast/approved-origins.json', import.meta.url), 'utf8'));
const copy = value => structuredClone(value);

test('canonical discovery has two official provider routes, not owned live broadcasts', () => {
  const plan = loadCanonicalDiscovery();
  assert.equal(plan.brand, 'Neofinity');
  assert.equal(plan.service, 'NeoCast');
  assert.equal(plan.mode, 'read-only-official-launch');
  assert.equal(plan.networkLiveVerified, false);
  assert.equal(plan.broadcastOriginLiveVerified, false);
  assert.deepEqual(plan.entries.map(x => x.id).sort(), ['nasa-plus', 'pbs']);
  assert.equal(plan.blocked.length, 0);
  for (const item of plan.entries) {
    assert.equal(item.mediaDelivery, 'provider-operated');
    assert.equal(item.licenseToRebroadcast, false);
    assert.equal(item.availabilityVerifiedLive, false);
  }
});

test('launch plan navigates to official player only, never serves a media stream', () => {
  const plan = loadCanonicalDiscovery();
  const route = planOfficialLaunch(plan, 'nasa-plus');
  assert.equal(route.allowed, true);
  assert.equal(new URL(route.url).hostname, 'plus.nasa.gov');
  assert.equal(route.streamUrl, null);
  assert.equal(route.proxy, false);
  assert.equal(route.recording, false);
  assert.equal(route.retransmission, false);
});

test('unknown provider is blocked', () => {
  assert.deepEqual(planOfficialLaunch(loadCanonicalDiscovery(), 'unknown'), {
    allowed: false, reason: 'no_approved_official_provider_route'
  });
});

test('direct media, unknown rights modes and geo status claims cannot silently launch', () => {
  const input = copy(registry);
  input.providers[0].playbackMode = 'direct-authorized';
  const plan = buildDiscovery(input, policy);
  assert.equal(plan.entries.some(x => x.id === 'nasa-plus'), false);
  assert.equal(plan.blocked[0].reason, 'not_approved_for_official_launch');
});

test('http, unapproved host and credential-bearing URLs are all rejected', () => {
  for (const url of [
    'http://plus.nasa.gov/',
    'https://not-nasa.gov/',
    'https://evil.example/?redirect=plus.nasa.gov',
    'https://user:pass@plus.nasa.gov/',
    'javascript:alert(1)'
  ]) {
    const input = copy(registry);
    input.providers[0].officialUrl = url;
    const plan = buildDiscovery(input, policy);
    assert.equal(plan.entries.some(x => x.id === 'nasa-plus'), false, url);
  }
});

test('missing policy, duplicate IDs, unapproved source class fail closed', () => {
  const missing = buildDiscovery(registry, {});
  assert.equal(missing.entries.length, 0);
  const duplicate = copy(registry);
  duplicate.providers.push(copy(duplicate.providers[0]));
  assert.equal(buildDiscovery(duplicate, policy).blocked.some(x => x.reason === 'invalid_or_duplicate_id'), true);
  const yellow = copy(registry);
  yellow.providers[0].sourceClass = 'yellow';
  assert.equal(buildDiscovery(yellow, policy).entries.some(x => x.id === 'nasa-plus'), false);
});

test('no official-player link may be promoted to retransmission or owned origin', () => {
  const plan = loadCanonicalDiscovery();
  const forged = copy(plan);
  forged.entries[0].licenseToRebroadcast = true;
  assert.equal(planOfficialLaunch(forged, forged.entries[0].id).allowed, false);
  forged.entries[0].licenseToRebroadcast = false;
  forged.entries[0].mediaDelivery = 'neocast-rebroadcast';
  assert.equal(planOfficialLaunch(forged, forged.entries[0].id).allowed, false);
});
