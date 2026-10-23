import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const root = 'https://shemsizedek.github.io/neo-system';
const expectedSource = 'https://holytemples.org/hy/world-library/';
const maxAgeHours = Number(process.env.KNOWINDEX_MAX_AGE_HOURS || 168);
const manifest = JSON.parse(await fs.readFile('data/knowindex/reviewed-release.json', 'utf8'));
const evidence = JSON.parse(await fs.readFile('data/knowindex/pilot-report.json', 'utf8'));
const documents = JSON.parse(await fs.readFile('data/knowindex/pilot-documents.json', 'utf8'));
const request = async url => {
  const response = await fetch(url, { headers: { accept: 'application/json,text/html;q=0.5' }, redirect: 'manual', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, 'unexpected HTTP status for ' + url);
  return response;
};
assert.equal(manifest.publicationApproved, true);
assert.equal(manifest.sourceUrl, expectedSource);
assert.equal(manifest.documentCount, 1);
assert.equal(evidence.crawled, 1);
assert.equal(evidence.errors.length, 0);
assert.equal(documents.documents.length, 1);
const index = await (await request(root + '/api/noogle/index.json')).json();
assert.ok(Array.isArray(index.documents), 'public index missing documents');
const indexed = index.documents.filter(doc => doc.canonicalUrl === expectedSource);
assert.equal(indexed.length, 1, 'World Library must have exactly one reviewed indexed page');
const record = indexed[0];
const approved = documents.documents[0];
assert.equal(record.contentHash, approved.contentHash, 'live document hash differs from approved snapshot');
assert.equal(record.evidenceState, 'reference', 'live evidence-state mismatch');
assert.equal(record.publisher, approved.publisher);
assert.ok(record.title && record.summary, 'searchable metadata missing');
const hours = (Date.now() - Date.parse(index.generatedAt)) / 3600000;
assert.ok(hours >= 0 && hours <= maxAgeHours, 'live Noogle index freshness exceeded limit');
const page = await (await request(root + '/noogle/')).text();
assert.ok(page.includes('native-search.js'), 'Noogle UI missing native search script');
console.log(JSON.stringify({
  status: 'PASS',
  indexGeneratedAt: index.generatedAt,
  indexedDocuments: index.documents.length,
  knowindexDocuments: indexed.length,
  sourceUrl: record.canonicalUrl,
  contentHash: record.contentHash,
  evidenceRunUrl: manifest.runUrl,
  readOnly: true
}, null, 2));
