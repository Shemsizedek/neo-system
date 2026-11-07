import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEgaasBitcoinReader, createEgaasCounterpartyReader, createEgaasCrownCapabilityReader, createEgaasReadOnlyReview } from './egaas-readonly-adapters.mjs';
import { checkEgaasPublishingAuthority, verifyEgaasInclusion, EGAAS_SERVICE_ID, EGAAS_PUBLISH_SCOPE } from './egaas-verification.mjs';
import { prepareEgaasAnchor } from './egaas-anchors.mjs';

const hash = value => createHash('sha256').update(value).digest();
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const txid = 'a'.repeat(64), blockHash = 'b'.repeat(64), tipHash = 'c'.repeat(64);
const root = { server_ready: true, network: 'signet', backend_height: 102, counterparty_height: 102 };
const broadcast = { tx_hash: txid, block_index: 100, status: 'valid', source: 'SYNTHETIC-PUBLISHER', text: 'SYNTHETIC-TEXT' };
function counterpartyFixture({ change = (path, value) => value, origin = 'https://parser.invalid', calls = [] } = {}) {
  return createEgaasCounterpartyReader({ origin, nodeId: 'fixture-node', operatorId: 'fixture-operator', network: 'signet',
    fetchImpl: async (url, options) => {
      const path = new URL(url).pathname;
      calls.push({ url, options });
      const values = { '/v2/': root, [`/v2/broadcasts/${txid}`]: broadcast,
        '/v2/blocks/100': { block_index: 100, block_hash: blockHash }, '/v2/blocks/102': { block_index: 102, block_hash: tipHash } };
      assert.ok(Object.hasOwn(values, path), path);
      return json({ result: change(path, structuredClone(values[path])) });
    } });
}
test('Counterparty Core v2 adapter reads and normalizes the documented response shapes', async () => {
  const calls = [], reader = counterpartyFixture({ calls });
  const observation = await reader.read({ txid, blockHeight: 100 });
  assert.equal(observation.blockHash, blockHash);
  assert.equal(observation.bitcoinTipHash, tipHash);
  assert.equal(observation.parserHeight, 102);
  assert.equal(observation.text, broadcast.text);
  assert.equal(calls.length, 6);
  assert.ok(calls.every(call => call.options.method === 'GET' && call.options.redirect === 'error' && call.options.credentials === 'omit'));
  assert.equal((await reader.probe()).ready, true);
});
test('Counterparty transport rejects wrong networks, readiness, lag, malformed blocks and invalid broadcast data', async () => {
  for (const [path, patch] of [
    ['/v2/', { network: 'mainnet' }], ['/v2/', { server_ready: false }], ['/v2/', { counterparty_height: 101 }],
    [`/v2/broadcasts/${txid}`, { status: 'invalid' }], [`/v2/broadcasts/${txid}`, { tx_hash: tipHash }],
    [`/v2/broadcasts/${txid}`, { block_index: 99 }], ['/v2/blocks/100', { block_hash: 'invalid' }],
  ]) {
    const reader = counterpartyFixture({ change: (current, value) => current === path ? { ...value, ...patch } : value });
    await assert.rejects(reader.read({ txid, blockHeight: 100 }));
  }
});
test('same-height Counterparty tip changes invalidate the snapshot', async () => {
  let tips = 0;
  const reader = counterpartyFixture({ change: (path, value) => path === '/v2/blocks/102' && ++tips === 2 ? { ...value, block_hash: blockHash } : value });
  await assert.rejects(reader.read({ txid, blockHeight: 100 }), /snapshot_changed/);
});
test('trusted origins reject embedded credentials, query strings, paths and insecure remote transport', () => {
  for (const origin of ['https://user:credential@example.invalid', 'https://example.invalid/?key=value', 'https://example.invalid/untrusted', 'http://remote.invalid']) {
    assert.throws(() => createEgaasBitcoinReader({ origin }), /trusted_origin_required/);
  }
  assert.doesNotThrow(() => createEgaasBitcoinReader({ origin: 'http://127.0.0.1:8332', allowLoopbackHttp: true }));
  assert.throws(() => createEgaasBitcoinReader({ origin: 'http://127.0.0.1:8332' }), /trusted_origin_required/);
  assert.throws(() => createEgaasBitcoinReader({ origin: 'http://remote.invalid', allowLoopbackHttp: true }), /trusted_origin_required/);
});
test('Bitcoin RPC permits only six read methods with constrained params, and validates response correlation', async () => {
  const calls = [];
  const rpc = createEgaasBitcoinReader({ origin: 'https://bitcoin.invalid', fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body); calls.push(body); return json({ id: body.id, result: { chain: 'signet' }, error: null });
  } });
  await rpc('getblockchaininfo', []);
  assert.equal(calls.length, 1);
  for (const [method, params] of [['sendrawtransaction', ['00']], ['signrawtransactionwithkey', []], ['getblockhash', [-1]], ['getrawtransaction', [txid, false]], ['gettxoutproof', [[txid, tipHash], blockHash]], ['verifytxoutproof', ['zz']]]) await assert.rejects(rpc(method, params), /readonly_rpc_method_or_params_rejected/);
  assert.equal(calls.length, 1);
  for (const data of [{ id: 'wrong', result: {} }, { id: 'egaas-read-1', error: { code: -1 } }, { id: 'egaas-read-1' }]) {
    const invalid = createEgaasBitcoinReader({ origin: 'https://bitcoin.invalid', fetchImpl: async () => json(data) });
    await assert.rejects(invalid('getblockchaininfo', []), /invalid_bitcoin_rpc_response/);
  }
});
test('transport rejects redirects, errors, HTML, invalid JSON and oversized streams without reflecting upstream text', async () => {
  for (const response of [new Response('PRIVATE-FIXTURE', { status: 302 }), new Response('PRIVATE-FIXTURE', { status: 500 }), new Response('<html>PRIVATE-FIXTURE</html>', { headers: { 'content-type': 'text/html' } }), new Response('{PRIVATE-FIXTURE', { headers: { 'content-type': 'application/json' } }), new Response('x'.repeat(2100001), { headers: { 'content-type': 'application/json' } })]) {
    const reader = createEgaasCounterpartyReader({ origin: 'https://parser.invalid', nodeId: 'fixture-node', operatorId: 'fixture-operator', network: 'signet', fetchImpl: async () => response });
    await assert.rejects(reader.probe(), error => error.message === 'readonly_upstream_unavailable_or_invalid');
  }
});
test('Crown adapter reuses verification only and supports Unix-second expiry without granting root approval', async () => {
  const now = () => Date.parse('2026-11-07T13:00:00.000Z');
  const policy = { network: 'signet', publisher: 'SYNTHETIC-PUBLISHER', manifestHash: 'd'.repeat(64), minimumConfirmations: 3 };
  const calls = [];
  const makeReader = expiry => createEgaasCrownCapabilityReader({ origin: 'https://crown.invalid', authorization: 'SYNTHETIC-NON-CREDENTIAL', fetchImpl: async (url, options) => {
    calls.push({ url, method: options.method });
    const body = JSON.parse(options.body);
    assert.equal(body.required_scope, EGAAS_PUBLISH_SCOPE);
    return json({ valid: true, service_id: EGAAS_SERVICE_ID, scopes: [EGAAS_PUBLISH_SCOPE], manifest_hash: policy.manifestHash, expires_at: expiry });
  } });
  for (const expiry of [Math.floor(now() / 1000) + 300, new Date(now() + 300000).toISOString()]) {
    const result = await checkEgaasPublishingAuthority({ policy, now, verifyCapability: makeReader(expiry) });
    assert.equal(result.verified, true);
    assert.equal(result.rootApprovalVerified, false);
    assert.equal(result.publishingEnabled, false);
  }
  for (const expiry of [Math.floor(now() / 1000) - 1, '1794056700', now() + 300000, null, -1]) assert.equal((await checkEgaasPublishingAuthority({ policy, now, verifyCapability: makeReader(expiry) })).verified, false);
  assert.ok(calls.every(call => call.url === 'https://crown.invalid/api/v1/trust/verify' && call.method === 'POST'));
});
test('full HTTP-shaped fixture chain reaches the existing inclusion verifier with no live network or transaction', async () => {
  const now = () => Date.parse('2026-11-07T13:00:00.000Z');
  const policy = { network: 'signet', publisher: 'SYNTHETIC-PUBLISHER', manifestHash: 'd'.repeat(64), minimumConfirmations: 3 };
  const batch = prepareEgaasAnchor({ commitments: [hash('SYNTHETIC-FIXTURE').toString('hex')] });
  const headerBytes = Buffer.alloc(80, 0), block = Buffer.from(hash(hash(headerBytes))).reverse().toString('hex');
  const rpc = createEgaasBitcoinReader({ origin: 'https://bitcoin.invalid', fetchImpl: async (_url, options) => {
    const body = JSON.parse(options.body);
    const replies = { getblockchaininfo: { chain: 'signet', initialblockdownload: false, blocks: 102, headers: 102, bestblockhash: tipHash },
      getblockheader: { height: 100, hash: block, confirmations: 3 }, getrawtransaction: { txid, blockhash: block, confirmations: 3 },
      getblockhash: block, gettxoutproof: headerBytes.toString('hex') + '00', verifytxoutproof: [txid] };
    return json({ id: body.id, result: replies[body.method], error: null });
  } });
  const nodes = [1, 2].map(id => createEgaasCounterpartyReader({ origin: `https://parser-${id}.invalid`, nodeId: `fixture-${id}`, operatorId: `fixture-operator-${id}`, network: 'signet', now,
    fetchImpl: async url => {
      const path = new URL(url).pathname;
      const replies = { '/v2/': root, [`/v2/broadcasts/${txid}`]: { ...broadcast, text: batch.counterpartyBroadcastText },
        '/v2/blocks/100': { block_index: 100, block_hash: block }, '/v2/blocks/102': { block_index: 102, block_hash: tipHash } };
      assert.ok(Object.hasOwn(replies, path), path);
      return json({ result: replies[path] });
    } }));
  const result = await verifyEgaasInclusion({ batch, txid, blockHash: block, blockHeight: 100 }, { policy, rpc, counterpartyNodes: nodes, now });
  assert.equal(result.verified, true);
  assert.equal(result.publishingEnabled, false);
});
test('staging review wires no default connections and pins configuration outside requests', async () => {
  const blank = createEgaasReadOnlyReview();
  assert.equal((await blank.checkAuthority()).reason, 'publishing_policy_unconfigured');
  assert.equal((await blank.checkInclusion({})).reason, 'publishing_policy_unconfigured');
  assert.throws(() => createEgaasReadOnlyReview({ policy: { network: 'mainnet' }, counterparty: [{ network: 'signet' }] }), /network_mismatch/);
  const policy = { network: 'signet', publisher: 'SYNTHETIC-PUBLISHER', manifestHash: 'd'.repeat(64), minimumConfirmations: 3 };
  const now = () => Date.parse('2026-11-07T13:00:00.000Z');
  const review = createEgaasReadOnlyReview({ policy, now, crown: { origin: 'https://crown.invalid', authorization: 'SYNTHETIC-NON-CREDENTIAL' }, fetchImpl: async () => json({ valid: true, service_id: EGAAS_SERVICE_ID, scopes: [EGAAS_PUBLISH_SCOPE], manifest_hash: 'd'.repeat(64), expires_at: Math.floor(now() / 1000) + 300 }) });
  policy.manifestHash = '0'.repeat(64);
  assert.equal((await review.checkAuthority()).verified, true);
});
