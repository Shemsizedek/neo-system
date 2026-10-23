import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const api = 'https://neo-platform-api-recovery.onrender.com';
const indexUrl = 'https://shemsizedek.github.io/neo-system/api/noogle/index.json';
const worldLibrary = 'https://holytemples.org/hy/world-library/';
const report = JSON.parse(await fs.readFile('data/knowindex/pilot-documents.json', 'utf8'));
const approved = report.documents.find(doc => doc.canonicalUrl === worldLibrary);
assert.ok(approved, 'approved World Library record required');

async function fetchExpected(url, status, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(60000),
    headers: { accept: 'application/json', ...(options.headers || {}) },
    ...options
  });
  assert.equal(response.status, status, 'unexpected HTTP response from ' + new URL(url).pathname);
  return response;
}

const platform = await (await fetchExpected(api + '/api/v1/platforms', 200)).json();
assert.equal(platform.apiVersion, 'v1', 'platform API not responding normally');

const disabled = await (await fetchExpected(api + '/api/v1/noogle/knowledge/contributions', 503)).json();
assert.equal(disabled.error, 'knowindex_writes_not_configured');
assert.equal(disabled.writesEnabled, false);

await fetchExpected(api + '/api/v1/noogle/knowledge/contributions', 403, {
  method: 'OPTIONS',
  headers: { origin: 'https://untrusted.example', 'access-control-request-method': 'POST' }
});

const index = await (await fetchExpected(indexUrl, 200)).json();
assert.ok(Array.isArray(index.documents), 'public Noogle index unavailable');
const published = index.documents.filter(doc => doc.canonicalUrl === worldLibrary);
assert.equal(published.length, 1, 'expected one independently reviewed World Library item');
assert.equal(published[0].contentHash, approved.contentHash, 'public source integrity changed');

console.log(JSON.stringify({
  gate: 'KI-016',
  status: 'READ_ONLY_GUARD_PASS',
  platformHttp: 200,
  writeEndpointHttp: 503,
  untrustedOriginHttp: 403,
  publicSearchHttp: 200,
  reviewedWorldLibraryRecords: published.length,
  productionWritesEnabled: false,
  identityRoleBindingCertified: false,
  dedicatedDatabaseCertified: false,
  note: 'Anonymous HTTP smoke only; does not establish actual member identity or production recovery.'
}));
