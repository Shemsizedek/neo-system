import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createFilesystemStorage, restoreObjectFromExport, verifyExportBundle, sha256 } from '../neo-storage/fabric.mjs';
import { createSyntheticGisdCustody, canonicalSyntheticGisdReceipt } from './egaas-custody.mjs';
import { prepareEgaasAnchor } from './egaas-anchors.mjs';
import { checkEgaasPublishingAuthority, verifyEgaasInclusion, EGAAS_SERVICE_ID, EGAAS_PUBLISH_SCOPE } from './egaas-verification.mjs';

const receipt = { schema: 'neo-gisd-synthetic-receipt-v1', synthetic: true, receiptId: 'SYNTHETIC-RECEIPT-1', learnerId: 'SYNTHETIC-LEARNER-1', courseId: 'SYNTHETIC-GISD-101', completedAt: '2026-11-07T12:00:00.000Z' };
test('encrypted receipt survives reopen and portable backup restore without plaintext or nonce in public batch', () => {
  const root = mkdtempSync(join(tmpdir(), 'egaas-custody-test-'));
  const key = randomBytes(32);
  try {
    assert.equal(statSync(root).mode & 0o077, 0);
    const storage = createFilesystemStorage(join(root, 'store'));
    const custody = createSyntheticGisdCustody({ storage, key });
    const first = custody.save(receipt), second = custody.save(receipt);
    assert.notEqual(first.commitment, second.commitment);
    const reopened = createSyntheticGisdCustody({ storage: createFilesystemStorage(join(root, 'store')), key });
    assert.deepEqual(reopened.restore(first.custodyRef), { record: receipt, commitment: first.commitment });
    const publicBatch = reopened.prepare([first.custodyRef, second.custodyRef]);
    assert.equal(publicBatch.count, 2);
    assert.equal(publicBatch.anchored, false);
    assert.doesNotMatch(JSON.stringify(publicBatch), /SYNTHETIC-LEARNER|completedAt|nonce|custodyRef/);
    for (const file of readdirSync(join(root, 'store', 'objects'))) assert.equal(readFileSync(join(root, 'store', 'objects', file)).includes(Buffer.from(receipt.learnerId)), false);
    storage.exportBundle(join(root, 'backup'));
    assert.equal(verifyExportBundle(join(root, 'backup')).valid, true);
    const restored = JSON.parse(restoreObjectFromExport(join(root, 'backup'), first.custodyRef, { key }).toString());
    assert.deepEqual(restored.record, receipt);
    assert.equal(restored.commitment, first.commitment);
    assert.throws(() => createSyntheticGisdCustody({ storage, key: randomBytes(32) }).restore(first.custodyRef), /custody_restore_or_integrity_failed/);
    assert.throws(() => reopened.restore('../escape'), /invalid_custody_reference/);
  } finally { key.fill(0); rmSync(root, { recursive: true, force: true }); }
});
test('custody refuses non-synthetic records, extra personal fields and malformed dates', () => {
  for (const record of [{ ...receipt, synthetic: false }, { ...receipt, email: 'PRIVATE-FIXTURE' }, { ...receipt, learnerId: 'real-id' }, { ...receipt, completedAt: '2026-11-07' }]) assert.throws(() => canonicalSyntheticGisdReceipt(record), /synthetic_receipt_required/);
  assert.equal(canonicalSyntheticGisdReceipt(receipt), canonicalSyntheticGisdReceipt(Object.fromEntries(Object.entries(receipt).reverse())));
});
test('custody rejects ciphertext corruption and swapped objects', () => {
  const key = randomBytes(32), records = new Map();
  const storage = { put: object => records.set(object.content_digest, object), get: ref => records.get(ref) };
  const custody = createSyntheticGisdCustody({ storage, key });
  const first = custody.save(receipt), second = custody.save(receipt);
  const object = records.get(first.custodyRef);
  object.ciphertext[0] ^= 1;
  assert.throws(() => custody.restore(first.custodyRef), /custody_restore_or_integrity_failed/);
  records.set(first.custodyRef, records.get(second.custodyRef));
  assert.throws(() => custody.restore(first.custodyRef), /custody_restore_or_integrity_failed/);
  key.fill(0);
});

// All responses below are deliberate fixtures. They are not network evidence,
// a mined block, an authorized Crown capability, or a published transaction.
function fixture() {
  const nowValue = Date.parse('2026-11-07T13:00:00.000Z'), now = () => nowValue;
  const policy = { network: 'signet', publisher: 'SYNTHETIC-PUBLISHER-NOT-AN-ADDRESS', manifestHash: 'd'.repeat(64), minimumConfirmations: 3 };
  const batch = prepareEgaasAnchor({ commitments: [sha256('SYNTHETIC-COMMITMENT')] });
  const headerBytes = Buffer.alloc(80, 0);
  const doubleHash = bytes => createHash('sha256').update(createHash('sha256').update(bytes).digest()).digest();
  const blockHash = doubleHash(headerBytes).reverse().toString('hex');
  const txid = sha256('SYNTHETIC-TRANSACTION-NOT-BROADCAST');
  const chain = { chain: 'signet', initialblockdownload: false, blocks: 102, headers: 102, bestblockhash: 'f'.repeat(64) };
  const header = { height: 100, hash: blockHash, confirmations: 3 };
  const transaction = { txid, blockhash: blockHash, confirmations: 3 };
  const rpcCalls = [];
  const rpc = async (method, params) => {
    rpcCalls.push({ method, params });
    const replies = { getblockchaininfo: chain, getblockheader: header, getrawtransaction: transaction,
      getblockhash: blockHash, gettxoutproof: headerBytes.toString('hex') + '00', verifytxoutproof: [txid] };
    assert.ok(Object.hasOwn(replies, method), `unexpected RPC ${method}`);
    return structuredClone(replies[method]);
  };
  const observation = { network: 'signet', txid, blockHash, blockHeight: 100, status: 'valid', source: policy.publisher,
    text: batch.counterpartyBroadcastText, parserHeight: 102, bitcoinTipHash: chain.bestblockhash, observedAt: new Date(now()).toISOString() };
  const counterpartyNodes = [1, 2].map(id => ({ nodeId: `fixture-${id}`, operatorId: `fixture-operator-${id}`, origin: `https://fixture-${id}.invalid`, read: async () => structuredClone(observation) }));
  const capability = { ok: true, service_id: EGAAS_SERVICE_ID, scopes: [EGAAS_PUBLISH_SCOPE], manifest_hash: policy.manifestHash, expires_at: new Date(nowValue + 300000).toISOString() };
  return { policy, now, rpc, rpcCalls, chain, header, transaction, observation, counterpartyNodes, capability,
    input: { batch, txid, blockHash, blockHeight: 100 } };
}
test('publishing authority requires exact service, scope, pinned manifest and unexpired capability; never approves a root', async () => {
  const f = fixture();
  const good = await checkEgaasPublishingAuthority({ ...f, verifyCapability: async () => f.capability });
  assert.equal(good.verified, true);
  assert.equal(good.rootApprovalVerified, false);
  assert.equal(good.publishingEnabled, false);
  for (const patch of [{ ok: false }, { service_id: 'crown:btc:app:other' }, { scopes: ['crown.api.read'] }, { manifest_hash: 'a'.repeat(64) }, { expires_at: new Date(f.now() - 1).toISOString() }, { expires_at: null }]) {
    assert.equal((await checkEgaasPublishingAuthority({ ...f, verifyCapability: async () => ({ ...f.capability, ...patch }) })).verified, false);
  }
  assert.equal((await checkEgaasPublishingAuthority()).reason, 'publishing_policy_unconfigured');
  assert.equal((await checkEgaasPublishingAuthority({ ...f })).reason, 'crown_introspector_unconfigured');
  assert.equal((await checkEgaasPublishingAuthority({ ...f, verifyCapability: async () => { throw new Error('DO NOT REFLECT'); } })).reason, 'crown_introspection_unavailable');
});
test('fixture Bitcoin Merkle and two Counterparty observations agree, with read-only methods only', async () => {
  const f = fixture(), result = await verifyEgaasInclusion(f.input, f);
  assert.equal(result.verified, true);
  assert.equal(result.publishingEnabled, false);
  assert.equal(result.crownAuthorityChecked, false);
  assert.ok(f.rpcCalls.some(call => call.method === 'verifytxoutproof'));
  assert.deepEqual(f.rpcCalls.find(call => call.method === 'gettxoutproof').params, [[f.input.txid], f.input.blockHash]);
  assert.ok(f.rpcCalls.every(call => /^(getblockchaininfo|getblockheader|getrawtransaction|getblockhash|gettxoutproof|verifytxoutproof)$/.test(call.method)));
});
test('missing transactions, missing adapters and duplicate Counterparty operators stay unverified', async () => {
  const f = fixture();
  assert.equal((await verifyEgaasInclusion({ batch: f.input.batch }, f)).reason, 'awaiting_transaction');
  assert.equal((await verifyEgaasInclusion(f.input, { policy: f.policy })).reason, 'bitcoin_rpc_unconfigured');
  for (const field of ['nodeId', 'operatorId', 'origin']) {
    const nodes = f.counterpartyNodes.map(node => ({ ...node })); nodes[1][field] = nodes[0][field];
    assert.equal((await verifyEgaasInclusion(f.input, { ...f, counterpartyNodes: nodes })).verified, false);
  }
});
test('wrong network, lagging nodes, forged proof, orphan block and insufficient confirmations fail closed', async () => {
  for (const [method, mutate] of [
    ['getblockchaininfo', value => ({ ...value, chain: 'main' })],
    ['getblockchaininfo', value => ({ ...value, initialblockdownload: true })],
    ['getblockchaininfo', value => ({ ...value, headers: 103 })],
    ['getblockheader', value => ({ ...value, confirmations: -1 })],
    ['getrawtransaction', value => ({ ...value, txid: 'a'.repeat(64) })],
    ['gettxoutproof', () => 'aa'.repeat(81)],
    ['verifytxoutproof', () => []],
    ['getblockhash', () => 'a'.repeat(64)],
  ]) {
    const f = fixture();
    const result = await verifyEgaasInclusion(f.input, { ...f, rpc: async (name, params) => { const value = await f.rpc(name, params); return name === method ? mutate(value) : value; } });
    assert.equal(result.verified, false, method);
  }
  const f = fixture();
  assert.equal((await verifyEgaasInclusion(f.input, { ...f, policy: { ...f.policy, minimumConfirmations: 4 } })).verified, false);
});
test('Counterparty publisher, root, txid, block, validity, freshness, network and parser tip must all match', async () => {
  const f = fixture();
  for (const patch of [{ source: 'other-publisher' }, { text: 'other-root' }, { txid: 'a'.repeat(64) }, { blockHash: 'b'.repeat(64) }, { blockHeight: 99 }, { status: 'invalid' }, { observedAt: new Date(f.now() - 60001).toISOString() }, { observedAt: new Date(f.now() + 60001).toISOString() }, { observedAt: 'bad' }, { network: 'mainnet' }, { parserHeight: 101 }, { bitcoinTipHash: 'a'.repeat(64) }]) {
    const nodes = f.counterpartyNodes.map(node => ({ ...node }));
    nodes[1].read = async () => ({ ...f.observation, ...patch });
    assert.equal((await verifyEgaasInclusion(f.input, { ...f, counterpartyNodes: nodes })).verified, false, JSON.stringify(patch));
  }
});
test('chain movement during inspection invalidates the snapshot and next calls never reuse old success', async () => {
  const f = fixture(); let reads = 0;
  const rpc = async (method, params) => {
    const result = await f.rpc(method, params);
    if (method === 'getblockchaininfo' && ++reads >= 3) result.bestblockhash = 'a'.repeat(64);
    return result;
  };
  assert.equal((await verifyEgaasInclusion(f.input, { ...f, rpc })).reason, 'chain_changed_retry_required');
  assert.equal((await verifyEgaasInclusion(f.input, f)).verified, true);
  f.observation.status = 'invalid';
  assert.equal((await verifyEgaasInclusion(f.input, f)).verified, false);
});
test('batch tampering and transport errors fail without reflecting data', async () => {
  const f = fixture();
  assert.equal((await verifyEgaasInclusion({ ...f.input, batch: { ...f.input.batch, root: '0'.repeat(64) } }, f)).reason, 'batch_integrity_mismatch');
  const result = await verifyEgaasInclusion(f.input, { ...f, rpc: async () => { throw new Error('PRIVATE FIXTURE'); } });
  assert.equal(result.verified, false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE FIXTURE/);
});
