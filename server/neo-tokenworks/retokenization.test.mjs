import test from 'node:test';
import assert from 'node:assert/strict';
import { readPartnerManifest } from './partner-bridge.mjs';
import { COUNTERPARTY_MAX_RAW, decimalToRaw, readRetokenizationPolicy, buildRetokenizationPlan, reconcileRetokenization } from './retokenization.mjs';
import { parseCounterpartyJson, readCounterpartyPreflight } from '../../integrations/cherokee-trinity/counterparty-preflight.mjs';

const reference = readPartnerManifest();

test('Bitcoin Counterparty plan preserves units and exact quantities beyond safe JS integers', () => {
  const plan = buildRetokenizationPlan(reference);
  assert.equal(plan.direction, 'XPR_TO_BITCOIN_COUNTERPARTY');
  assert.equal(plan.state, 'DRAFT_NOT_EXECUTABLE');
  assert.equal(plan.destination.protocolPrecision, 8);
  assert.equal(plan.destination.migrationClaimPrecision, 4);
  assert.equal(plan.unitMapping.status, 'PROPOSED_REQUIRES_ISSUER_APPROVAL');
  assert.deepEqual(plan.assets.map(asset => asset.target.declaredMaximumRawUnits), ['77777700000000000', '640000000000000000', '314159265300000000']);
  for (const asset of plan.assets) {
    assert.equal(asset.target.divisible, true);
    assert.equal(asset.target.initialIssuanceRawUnits, '0');
    assert.equal(asset.target.issuanceVerified, false);
    assert.equal(asset.source.commit, reference.source.commit);
    assert.equal(asset.newAssetReservationTemplate.executable, false);
    assert.equal(asset.newAssetReservationTemplate.parameters.reset, false);
    assert.equal(asset.newAssetReservationTemplate.parameters.lock, false);
  }
  assert.equal(plan.issuerBitcoinAddress, null);
  assert.ok(Object.values(plan.execution).every(value => value === false));
  assert.equal(decimalToRaw('0.0001', 4) * 10000n, 10000n);
  assert.equal(decimalToRaw('1.0001', 8), 100010000n);
});

test('decimal parser rejects rounding, floats, negatives and scientific notation', () => {
  for (const input of [1, 1.2, '-1', '1e3', 'NaN', '0.00001', '.1', '1.', '', ' 1']) assert.throws(() => decimalToRaw(input, 4));
  assert.throws(() => decimalToRaw('1', 6));
});

test('planner rejects supply overflow and manifest-based execution activation', () => {
  const tooLarge = structuredClone(reference);
  tooLarge.tokens[0].declaredSupply = '92233720369.0000';
  assert.throws(() => buildRetokenizationPlan(tooLarge), /supply_limit/);
  assert.ok(BigInt(buildRetokenizationPlan(reference).assets[1].target.declaredMaximumRawUnits) < COUNTERPARTY_MAX_RAW);
  for (const operation of ['compose', 'sign', 'broadcast', 'issue', 'sourceRetirement', 'assetSupplyLock']) {
    const policy = readRetokenizationPolicy(); policy.execution[operation] = true;
    assert.throws(() => buildRetokenizationPlan(reference, policy), /invalid_retokenization_policy/);
  }
  const policy = readRetokenizationPolicy(); policy.unitMapping.targetUnits = '2';
  assert.throws(() => buildRetokenizationPlan(reference, policy), /invalid_retokenization_policy/);
});

test('reconciliation accepts conservative retirement math without authorizing issuance', () => {
  const report = reconcileRetokenization(reference, { symbol: 'TSDU', retiredSourceQuantity: '10.0001', remainingSourceQuantity: '6399999989.9999', issuedTargetQuantity: '10.00010000' });
  assert.equal(report.mathConsistent, true);
  assert.equal(report.combinedActiveTargetEquivalentRawUnits, '640000000000000000');
  assert.equal(report.sourceEvidenceVerified, false);
  assert.equal(report.executionEnabled, false);
});

test('reconciliation catches duplicate supply and unretired issuance', () => {
  const report = reconcileRetokenization(reference, { symbol: 'HALI', retiredSourceQuantity: '0', remainingSourceQuantity: '777777000', issuedTargetQuantity: '1' });
  assert.equal(report.mathConsistent, false);
  assert.ok(report.issues.includes('TARGET_ISSUANCE_EXCEEDS_REPORTED_SOURCE_RETIREMENT'));
  assert.ok(report.issues.includes('COMBINED_SUPPLY_EXCEEDS_DECLARED_CAP'));
});

test('reconciliation rejects sub-claim precision and invalid token identities', () => {
  const report = reconcileRetokenization(reference, { symbol: 'WAYA', retiredSourceQuantity: '1', remainingSourceQuantity: '0', issuedTargetQuantity: '0.00000001' });
  assert.ok(report.issues.includes('TARGET_ISSUANCE_EXCEEDS_SOURCE_CLAIM_PRECISION'));
  assert.throws(() => reconcileRetokenization(reference, { symbol: 'NOMNI' }), /unknown_partner_token/);
  assert.throws(() => reconcileRetokenization(reference, { symbol: 'WAYA', retiredSourceQuantity: 1, remainingSourceQuantity: '0', issuedTargetQuantity: '1' }), /decimal_string/);
});

const headers = { 'x-counterparty-ready': 'True', 'x-counterparty-height': '973643', 'x-bitcoin-height': '973643' };
const owner = 'fixture-owner-not-a-live-claim';
function fixture({ rootNetwork = 'mainnet', ready = true, assetReady = true, assetStatus = 200, supply = '640000000000000001' } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(Object.hasOwn(options.headers, 'authorization'), false);
    assert.ok(!url.includes('/compose/') && !url.includes('/broadcast'));
    if (url.endsWith('/v2/')) return new Response(JSON.stringify({ result: { network: rootNetwork, server_ready: ready, version: 'fixture' } }), { headers });
    const asset = url.split('/').at(-1);
    const data = assetStatus === 404 ? { error: 'Not found' } : { result: { asset, owner, issuer: owner, divisible: true, locked: false, supply } };
    return new Response(JSON.stringify(data), { status: assetStatus, headers: { ...headers, 'x-counterparty-ready': assetReady ? 'True' : 'False' } });
  };
  return { fetchImpl, calls };
}

test('Counterparty JSON preserves unquoted raw quantities exactly', () => {
  const row = parseCounterpartyJson('{"result":{"supply":640000000000000001,"quantity":0,"divisible":true}}').result;
  assert.equal(row.supply, '640000000000000001');
  assert.equal(row.quantity, '0');
  assert.throws(() => parseCounterpartyJson('{"supply":1e18}'), /raw_integer/);
});

test('preflight identifies registered assets while leaving ownership and execution unverified', async () => {
  const { fetchImpl, calls } = fixture();
  const report = await readCounterpartyPreflight({ fetchImpl, now: () => '2026-10-29T00:00:00Z' });
  assert.equal(report.ok, true);
  assert.equal(report.nodeVerified, true);
  assert.equal(report.assets[0].state, 'REGISTERED_REQUIRES_OWNER_PROOF');
  assert.equal(report.assets[0].supplyRawUnits, '640000000000000001');
  assert.equal(report.assets[0].ownerControlVerified, false);
  assert.equal(report.executionEnabled, false);
  assert.equal(report.namesReserved, false);
  assert.deepEqual(calls, ['https://api.counterparty.io:4000/v2/', ...['HALI', 'TSDU', 'WAYA'].map(asset => `https://api.counterparty.io:4000/v2/assets/${asset}`)]);
});

test('404 is a time-bound not-found observation and never a reservation', async () => {
  const { fetchImpl } = fixture({ assetStatus: 404 });
  const report = await readCounterpartyPreflight({ fetchImpl });
  assert.equal(report.ok, true);
  assert.equal(report.assets[0].state, 'NOT_FOUND_OBSERVED');
  assert.equal(report.assets[0].nameReserved, false);
});

test('preflight fails closed for wrong networks, stale or unready data, upstream errors and invalid supplies', async () => {
  for (const config of [{ rootNetwork: 'testnet4' }, { ready: false }, { assetReady: false }, { supply: '9223372036854775808' }]) {
    const report = await readCounterpartyPreflight(fixture(config));
    assert.equal(report.ok, false);
    assert.equal(report.executionEnabled, false);
    assert.ok(report.assets.every(asset => asset.state === 'UNVERIFIED'));
  }
  for (const status of [302, 403, 429, 500]) {
    const report = await readCounterpartyPreflight({ fetchImpl: async () => new Response('{}', { status }) });
    assert.equal(report.ok, false);
    assert.match(report.error, /counterparty_http/);
  }
  const stale = await readCounterpartyPreflight({ fetchImpl: async () => new Response('{"result":{"network":"mainnet","server_ready":true}}', { headers: { ...headers, 'x-bitcoin-height': '973650' } }) });
  assert.equal(stale.nodeVerified, false);
  const oversized = await readCounterpartyPreflight({ fetchImpl: async () => new Response('x'.repeat(128 * 1024 + 1)) });
  assert.match(oversized.error, /response_too_large/);
});
