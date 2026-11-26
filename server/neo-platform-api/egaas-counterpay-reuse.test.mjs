import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEgaasCounterpayReview } from './egaas-readonly-adapters.mjs';
import { prepareEgaasAnchor } from './egaas-anchors.mjs';

const policy = { network: 'mainnet', publisher: 'SYNTHETIC-PUBLISHER', manifestHash: 'd'.repeat(64), minimumConfirmations: 1 };
const hash = bytes => createHash('sha256').update(bytes).digest();
function fixture() {
  const now = () => Date.parse('2026-11-07T12:00:00.000Z');
  const bytes = Buffer.alloc(80), blockHash = Buffer.from(hash(hash(bytes))).reverse().toString('hex');
  const txid = 'a'.repeat(64), batch = prepareEgaasAnchor({ commitments: ['b'.repeat(64)] });
  const calls = [];
  const rpc = async (method, params) => {
    calls.push({ method, params });
    const replies = { getblockchaininfo: { chain: 'main', initialblockdownload: false, blocks: 100, headers: 100, bestblockhash: blockHash },
      getblockheader: { height: 100, hash: blockHash, confirmations: 1 }, getrawtransaction: { txid, blockhash: blockHash, confirmations: 1 },
      getblockhash: blockHash, gettxoutproof: bytes.toString('hex') + '00', verifytxoutproof: [txid] };
    assert.ok(Object.hasOwn(replies, method)); return replies[method];
  };
  const reader = id => ({ network: 'mainnet', nodeId: `node-${id}`, operatorId: `operator-${id}`, origin: `https://node-${id}.invalid`,
    async read() { calls.push({ reader: this.nodeId }); return { network: 'mainnet', txid, blockHash, blockHeight: 100, status: 'valid', source: policy.publisher,
      text: batch.counterpartyBroadcastText, parserHeight: 100, bitcoinTipHash: blockHash, observedAt: new Date(now()).toISOString() }; } });
  const primary = reader('counterpay'), secondary = reader('corroboration');
  return { policy: { ...policy }, now, counterpay: { network: 'mainnet', bitcoinRpc: rpc, counterpartyReader: primary },
    independentCounterpartyReader: secondary, calls, input: { batch, txid, blockHash, blockHeight: 100 } };
}
test('existing Counterpay readers are reused without constructing endpoints or making calls at binding', async () => {
  const f = fixture(), review = createEgaasCounterpayReview(f);
  assert.equal(f.calls.length, 0);
  assert.equal(review.status.bitcoinReaderBound, true);
  assert.equal(review.status.liveVerified, false);
  assert.equal((await review.checkInclusion(f.input)).verified, true);
  assert.equal(f.calls.filter(call => call.reader === 'node-counterpay').length, 1);
  assert.equal(f.calls.filter(call => call.reader === 'node-corroboration').length, 1);
  assert.ok(f.calls.filter(call => call.method).every(call => /^(getblockchaininfo|getblockheader|getrawtransaction|getblockhash|gettxoutproof|verifytxoutproof)$/.test(call.method)));
});
test('a single Counterpay node is retained but is not counted twice', async () => {
  const f = fixture();
  const review = createEgaasCounterpayReview({ ...f, independentCounterpartyReader: undefined });
  assert.equal(review.status.primaryCounterpartyReaderBound, true);
  assert.equal(review.status.independentCounterpartyReaderBound, false);
  assert.equal((await review.checkInclusion(f.input)).reason, 'two_independent_counterparty_readers_required');
  assert.equal(f.calls.length, 0);
});
test('aliases of the same configured node/operator cannot masquerade as independent evidence', () => {
  for (const key of ['nodeId', 'operatorId', 'origin']) {
    const f = fixture(); f.independentCounterpartyReader[key] = f.counterpay.counterpartyReader[key];
    assert.throws(() => createEgaasCounterpayReview(f), /not_independent/);
  }
});
test('network mismatch, missing primary, raw wallet payloads and credential URLs cannot bind', () => {
  const f = fixture();
  assert.throws(() => createEgaasCounterpayReview({ ...f, counterpay: { ...f.counterpay, network: 'signet' } }), /network_mismatch/);
  assert.throws(() => createEgaasCounterpayReview({ ...f, counterpay: { network: 'mainnet' } }), /primary_reader_required/);
  for (const patch of [{ network: 'signet' }, { read: undefined }, { origin: 'https://user:credential@node.invalid' }]) {
    assert.throws(() => createEgaasCounterpayReview({ ...f, counterpay: { ...f.counterpay, counterpartyReader: { ...f.counterpay.counterpartyReader, ...patch } } }));
  }
});
test('missing bindings remain explicit and do not invent a connection or Crown authority', async () => {
  const f = fixture(), review = createEgaasCounterpayReview({ policy });
  assert.equal(review.status.bitcoinReaderBound, false);
  assert.equal(review.status.primaryCounterpartyReaderBound, false);
  assert.equal((await review.checkInclusion(f.input)).reason, 'bitcoin_rpc_unconfigured');
  assert.equal((await review.checkAuthority()).reason, 'crown_introspector_unconfigured');
  assert.equal((await createEgaasCounterpayReview().checkAuthority()).reason, 'publishing_policy_unconfigured');
});
