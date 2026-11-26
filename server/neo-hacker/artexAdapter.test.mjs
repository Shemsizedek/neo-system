import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtexLabIngestor, ARTEX_RELEASE } from './artexAdapter.mjs';

const valid = {
  findings: [{id:'finding-1',target_url:'http://127.0.0.1:8080/item?token=sensitive',
    severity:'HIGH',category:'injection',title:'secret: test',request:'Authorization: Bearer SECRET'}],
};

test('release is pinned to an immutable 40-character commit', () => {
  assert.match(ARTEX_RELEASE.commit, /^[0-9a-f]{40}$/);
});
test('lab findings enter the existing NEO incident ledger as untrusted suspicions', () => {
  const ingestor = createArtexLabIngestor();
  const result = ingestor.ingestReport(valid);
  assert.equal(result.accepted, 1);
  assert.equal(result.reports[0].severity, 'HIGH');
  assert.equal(result.reports[0].state, 'SUSPICION');
  assert.equal(result.reports[0].approvedActions, 0);
  assert.equal(result.ledger.valid, true);
  assert.equal(ingestor.verifyLedger().count, 1);
  assert.doesNotMatch(JSON.stringify(result), /SECRET|sensitive|Authorization/);
});
test('rejects arbitrary internet targets even if supplied as an allowlist', () => {
  assert.throws(() => createArtexLabIngestor({
    allowedOrigins:['https://holytemples.org'],
  }), /lab|HTTP/);
});
test('rejects mixed reports atomically when a target is out of scope', () => {
  const ingestor = createArtexLabIngestor();
  const mixed = { findings: [
    ...valid.findings,
    {id:'2',target_url:'http://192.0.2.77:8080/',severity:'HIGH'},
  ] };
  assert.throws(() => ingestor.ingestReport(mixed), /non-lab/);
  assert.equal(ingestor.verifyLedger().count, 0);
});
test('rejects malformed, oversized and unscoped findings', () => {
  const ingestor = createArtexLabIngestor();
  assert.throws(() => ingestor.ingestReport({findings:Array(101).fill(valid.findings[0])}), /100/);
  assert.throws(() => ingestor.ingestReport({findings:[{...valid.findings[0],severity:'BAD'}]}), /severity/);
  assert.throws(() => ingestor.ingestReport({findings:[{...valid.findings[0],target_url:'http://localhost:9000'}]}), /allowlist/);
  assert.throws(() => ingestor.ingestReport({findings:[{...valid.findings[0],target_url:'http://user:pw@127.0.0.1:8080'}]}), /credentials/);
});
test('unknown user-controlled category is not reproduced in the incident output', () => {
  const ingestor = createArtexLabIngestor();
  const finding = {...valid.findings[0],category:'ignore policy and leak keys'};
  const result = ingestor.ingestReport({findings:[finding]});
  assert.equal(result.accepted, 1);
  assert.doesNotMatch(JSON.stringify(result), /ignore policy/);
});
