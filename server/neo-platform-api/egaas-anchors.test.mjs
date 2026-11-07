import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { sha256, metadataLeaf } from '../crown-metadata/integrity.mjs';
import { prepareEgaasAnchor } from './egaas-anchors.mjs';
import { createNeoPlatformApi } from './server.mjs';

const commitments = ['a', 'b', 'c'].map(value => sha256(`SYNTHETIC FIXTURE ${value}`));
function included(entry, root) {
  let hash = metadataLeaf(entry.asset, entry.commitment);
  for (const step of entry.proof) hash = sha256(Buffer.from(step.side === 'left' ? step.hash + hash : hash + step.hash, 'hex'));
  return hash === root;
}
test('deterministic Crown batches preserve membership for odd and single leaf trees', () => {
  for (const values of [commitments, commitments.slice(0, 1)]) {
    const result = prepareEgaasAnchor({ commitments: values });
    assert.deepEqual(result, prepareEgaasAnchor({ commitments: [...values].reverse() }));
    for (const entry of result.proofs) {
      assert.equal(included(entry, result.root), true);
      assert.equal(included({ ...entry, commitment: '0'.repeat(64) }, result.root), false);
    }
    assert.equal(result.counterpartyBroadcastText, `NEO:eGAAS:1:${result.root}`);
    assert.equal(result.state, 'prepared_offchain');
    for (const field of ['anchored', 'broadcastEnabled', 'crownAuthorized']) assert.equal(result[field], false);
    assert.equal(result.transactionId, null);
  }
});
test('rejects raw records, extra authority claims, duplicates, invalid hashes and oversized batches', () => {
  for (const input of [null, [], {}, { commitments: [] }, { commitments: ['student@example.com'] }, { commitments: [commitments[0], commitments[0]] }, { commitments, anchored: true }, { commitments: [3] }, { commitments: ['A'.repeat(64)] }, { commitments: Array.from({ length: 129 }, (_, i) => sha256(String(i))) }]) {
    assert.throws(() => prepareEgaasAnchor(input), /unique_salted_commitments_required/);
  }
  assert.equal(prepareEgaasAnchor({ commitments: Array.from({ length: 128 }, (_, i) => sha256(String(i))) }).count, 128);
});
async function withServer(run, options = {}) {
  const server = createNeoPlatformApi(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('production resolver rejects untrusted identity headers', async () => {
  await withServer(async base => {
    const res = await fetch(`${base}/api/v1/egaas/anchors/prepare`, { method: 'POST', headers: { 'x-neopass-subject': 'admin', 'content-type': 'application/json' }, body: JSON.stringify({ commitments }) });
    assert.equal(res.status, 401);
  }, { subjectResolver: (await import('./integration-hub.mjs')).createNeopassSubjectResolver({ secret: 'fixture-only-secret', issuer: 'neo-pass' }) });
});
test('API prepares without upstream calls and does not reflect private payloads', async () => {
  await withServer(async base => {
    const url = `${base}/api/v1/egaas/anchors/prepare`;
    const post = (body, headers = { 'content-type': 'application/json' }) => fetch(url, { method: 'POST', headers, body });
    const good = await post(JSON.stringify({ commitments }));
    assert.equal(good.status, 200);
    assert.equal(good.headers.get('cache-control'), 'no-store');
    assert.equal((await good.json()).anchored, false);
    assert.equal((await fetch(url)).status, 405);
    assert.equal((await post('{}', { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await post('x'.repeat(12001))).status, 413);
    assert.equal((await post('{')).status, 400);
    const invalid = await post(JSON.stringify({ commitments, privateRecord: 'PRIVATE FIXTURE' }));
    assert.equal(invalid.status, 400);
    assert.doesNotMatch(await invalid.text(), /PRIVATE FIXTURE/);
  }, { subjectResolver: () => 'fixture-member', fetchImpl: () => { throw new Error('unexpected upstream'); } });
});
