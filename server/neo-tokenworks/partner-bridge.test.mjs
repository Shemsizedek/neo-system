import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createPartnerBridge, readPartnerManifest, validatePartnerManifest } from './partner-bridge.mjs';
import { createTokenworksServer } from './server.mjs';
import { verifySourceFiles, verifyLiveSource } from '../../integrations/cherokee-trinity/source-verifier.mjs';

const manifest = readPartnerManifest();
const partnerId = 'cherokee-trinity';
const prefix = '/api/v1/tokenworks/partners';

test('catalog preserves XPR asset identity, declared provenance and exact supply strings', () => {
  const bridge = createPartnerBridge();
  assert.equal(bridge.listPartners().partners[0].repository, 'kburrjr/cherokee-trinity-token-system');
  const { assets } = bridge.getAssets(partnerId);
  assert.deepEqual(assets.map(asset => asset.assetId), ['xpr-network:tokencreate:HALI', 'xpr-network:tokencreate:TSDU', 'xpr-network:tokencreate:WAYA']);
  assert.equal(assets[1].declaredSupply, '6400000000.0000');
  for (const asset of assets) {
    assert.equal(asset.verificationStatus, 'PARTNER_DECLARED');
    assert.equal(asset.chainId, null);
    assert.equal(asset.source.commit, manifest.source.commit);
    assert.equal(Object.hasOwn(asset, 'price'), false);
    assert.equal(Object.hasOwn(asset, 'balance'), false);
  }
  assert.equal(bridge.getPartner(partnerId).sourceIntegrity, 'PINNED_NOT_LIVE_CHECKED');
  assert.equal(bridge.getPartner(partnerId).relationship.agreementVerified, false);
  assert.equal(bridge.getAssets('unknown'), null);
});

test('returned references cannot mutate later responses or activate capabilities', () => {
  const bridge = createPartnerBridge();
  const result = bridge.getPartner(partnerId);
  result.capabilities.sign = true;
  result.tokens[0].declaredSupply = '1.0000';
  const assets = bridge.getAssets(partnerId);
  assets.assets[0].source.commit = 'changed';
  assert.equal(bridge.getPartner(partnerId).capabilities.sign, false);
  assert.equal(bridge.getPartner(partnerId).tokens[0].declaredSupply, '777777000.0000');
  assert.equal(bridge.getAssets(partnerId).assets[0].source.commit, manifest.source.commit);
});

test('reference manifest fails closed on execution, identity and provenance changes', () => {
  const changes = [
    value => { value.capabilities.sign = true; },
    value => { value.capabilities.swap = true; },
    value => { value.capabilities.identityFederation = true; },
    value => { value.capabilities.unreviewed = true; },
    value => { value.mode = 'MAINNET'; },
    value => { value.network.deploymentVerified = true; },
    value => { value.network.rpcUrl = 'https://attacker.example'; },
    value => { value.relationship.agreementVerified = true; },
    value => { value.source.repository = 'another/repository'; },
    value => { value.source.commit = 'main'; },
    value => { value.source.files[0].path = '../../secret'; },
    value => { value.source.files[1] = value.source.files[0]; },
    value => { value.tokens[0].symbol = 'NOMNI'; },
    value => { value.tokens[0].declaredSupply = 777777000; },
    value => { value.tokens[0].precision = 8; },
    value => { value.tokens[0].issuer = 'someoneelse'; }
  ];
  for (const change of changes) {
    const value = structuredClone(manifest); change(value);
    assert.throws(() => validatePartnerManifest(value), /invalid_partner_manifest/);
  }
});

test('Tokenworks serves public references and rejects writes before calling authorization', async () => {
  const server = createTokenworksServer({ crownAuthorizer: () => { throw new Error('partner catalog must never request wallet authority'); } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const catalog = await fetch(`${base}${prefix}`);
    assert.equal(catalog.status, 200);
    assert.equal((await catalog.json()).partners[0].id, partnerId);
    const detail = await fetch(`${base}${prefix}/${partnerId}`);
    assert.equal((await detail.json()).network.deploymentVerified, false);
    const assets = await fetch(`${base}${prefix}/${partnerId}/assets`);
    assert.equal((await assets.json()).assets.length, 3);
    const migration = await fetch(`${base}${prefix}/${partnerId}/retokenization`);
    assert.equal(migration.status, 200);
    assert.equal((await migration.json()).direction, 'XPR_TO_BITCOIN_COUNTERPARTY');
    const capabilities = await (await fetch(`${base}/api/v1/tokenworks/capabilities`)).json();
    assert.equal(capabilities.partnerBridge.metadata, true);
    assert.equal(capabilities.partnerBridge.retokenizationPlanning, true);
    assert.equal(capabilities.partnerBridge.settlement, false);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await fetch(`${base}${prefix}/${partnerId}/transfer`, { method });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET, OPTIONS');
      assert.equal((await response.json()).error, 'partner_bridge_read_only');
    }
    assert.equal((await fetch(`${base}${prefix}/unknown`)).status, 404);
    assert.equal((await fetch(`${base}${prefix}/${partnerId}/unimplemented`)).status, 404);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  } finally {
    server.close(); server.closeAllConnections(); await once(server, 'close');
  }
});

// Known SHA-256 and Git blob fingerprints for the six bytes "hello\n".
function sourceFixture() {
  const value = structuredClone(manifest);
  for (const file of value.source.files) Object.assign(file, {
    bytes: 6,
    sha256: '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03',
    gitBlobSha: 'ce013625030ba8dba906f756967f9e9ca394464a'
  });
  return { value, files: new Map(value.source.files.map(file => [file.path, Buffer.from('hello\n')])) };
}

test('source verification detects byte changes and missing documents', () => {
  const { value, files } = sourceFixture();
  assert.equal(verifySourceFiles(value, files).snapshotIntegrityVerified, true);
  files.set('README.md', Buffer.from('hello!'));
  assert.equal(verifySourceFiles(value, files).snapshotIntegrityVerified, false);
  files.delete('README.md');
  assert.equal(verifySourceFiles(value, files).files[0].reason, 'source_file_missing');
});

function githubFixture(value, { head = value.source.commit, content = 'aGVsbG8K' } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'error');
    assert.equal(Object.hasOwn(options.headers, 'authorization'), false);
    assert.ok(options.signal instanceof AbortSignal);
    const data = url.endsWith('/commits/main') ? { sha: head } : { encoding: 'base64', content };
    return new Response(JSON.stringify(data));
  };
  return { fetchImpl, calls };
}

test('live source check binds file contents to the pinned commit with fixed GET URLs', async () => {
  const { value } = sourceFixture();
  const { fetchImpl, calls } = githubFixture(value);
  const report = await verifyLiveSource(value, { fetchImpl, now: () => '2026-10-29T00:00:00Z' });
  assert.equal(report.ok, true);
  assert.equal(report.observedAt, '2026-10-29T00:00:00Z');
  assert.equal(report.deploymentVerified, false);
  assert.equal(report.financialActivationEnabled, false);
  assert.deepEqual(calls, [
    'https://api.github.com/repos/kburrjr/cherokee-trinity-token-system/commits/main',
    ...value.source.files.map(file => `https://api.github.com/repos/kburrjr/cherokee-trinity-token-system/contents/${file.path}?ref=${value.source.commit}`)
  ]);
});

test('upstream drift is reported without replacing the approved pin', async () => {
  const { value } = sourceFixture();
  const { fetchImpl } = githubFixture(value, { head: 'a'.repeat(40) });
  const report = await verifyLiveSource(value, { fetchImpl });
  assert.equal(report.snapshotIntegrityVerified, true);
  assert.equal(report.upstreamHeadMatchesPin, false);
  assert.equal(report.ok, false);
  assert.equal(report.pinnedCommit, manifest.source.commit);
});

test('incorrect upstream contents do not verify even with a matching head', async () => {
  const { value } = sourceFixture();
  const { fetchImpl } = githubFixture(value, { content: Buffer.from('modified').toString('base64') });
  const report = await verifyLiveSource(value, { fetchImpl });
  assert.equal(report.upstreamHeadMatchesPin, true);
  assert.equal(report.snapshotIntegrityVerified, false);
  assert.equal(report.ok, false);
});

test('source checks reject upstream errors, invalid heads, redirects and oversized responses', async () => {
  for (const status of [302, 403, 404, 429, 500]) {
    await assert.rejects(() => verifyLiveSource(manifest, { fetchImpl: async () => new Response('{}', { status }) }), new RegExp(`partner_source_http_${status}`));
  }
  await assert.rejects(() => verifyLiveSource(manifest, { fetchImpl: async () => new Response('{"sha":"main"}') }), /invalid_partner_head/);
  await assert.rejects(() => verifyLiveSource(manifest, { fetchImpl: async () => new Response('x'.repeat(256 * 1024 + 1)) }), /partner_source_response_too_large/);
});
