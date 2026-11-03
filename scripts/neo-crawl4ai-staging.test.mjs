import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCrawl4AIStaging } from './neo-crawl4ai-staging.mjs';
const source = 'https://holytemples.org/world-library/';
const env = { NEO_CRAWL4AI_ORIGIN: 'http://127.0.0.1:11235', NEO_CRAWL4AI_TOKEN: 'test-service-token', NEO_CRAWL4AI_STAGE: 'isolated-staging' };
const result = { success: true, results: [{ url: source, success: true, status_code: 200, markdown: '# Test source' }] };
const json = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
test('missing connection is blocked without network access or values', async () => {
  let calls = 0;
  const report = await validateCrawl4AIStaging({ env: {}, live: true, fetchImpl: async () => { calls++; } });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(calls, 0);
  assert.equal(report.sourceCrawlAttempts, 0);
  assert.deepEqual(report.blockers[0].names, ['NEO_CRAWL4AI_ORIGIN', 'NEO_CRAWL4AI_TOKEN']);
});
test('default preflight never contacts a configured service', async () => {
  const report = await validateCrawl4AIStaging({ env, fetchImpl: () => { throw new Error('network forbidden'); } });
  assert.equal(report.status, 'CONFIGURED_NOT_TESTED');
  assert.equal(report.productionReady, false);
});
test('live mode requires explicit isolated staging selection', async () => {
  const report = await validateCrawl4AIStaging({ env: { ...env, NEO_CRAWL4AI_STAGE: 'production' }, live: true });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.sourceCrawlAttempts, 0);
});
test('configuration errors never echo credentials or endpoint input', async () => {
  const report = await validateCrawl4AIStaging({ env: { ...env, NEO_CRAWL4AI_ORIGIN: 'https://user:test-service-token@host/path' }, live: true });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(JSON.stringify(report).includes('test-service-token'), false);
});
test('unauthenticated service fails before sending a source URL or real token', async () => {
  const calls = [];
  const report = await validateCrawl4AIStaging({ env, live: true, fetchImpl: async (_, opts) => { calls.push(opts); return json({}); } });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.sourceCrawlAttempts, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].body), { urls: [] });
  assert.equal(calls[0].headers.authorization, undefined);
});
test('wrong-token acceptance also stops the crawl', async () => {
  let count = 0;
  const report = await validateCrawl4AIStaging({ env, live: true, fetchImpl: async () => ++count === 1 ? new Response('', { status: 401 }) : json({}) });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.sourceCrawlAttempts, 0);
});
test('successful smoke records only document metadata and never certifies release', async () => {
  const calls = [];
  const report = await validateCrawl4AIStaging({ env, live: true,
    lookupImpl: async () => [{ address: '93.184.216.34' }],
    fetchImpl: async (_, opts) => {
      calls.push(opts);
      return calls.length < 3 ? new Response('', { status: 401 }) : json(result);
    } });
  assert.equal(report.status, 'SMOKE_PASSED_NETWORK_REVIEW_REQUIRED');
  assert.equal(report.productionReady, false);
  assert.equal(report.sourceCrawlAttempts, 1);
  assert.equal(report.publicIndexWrites, 0);
  assert.equal(report.evidenceVaultWrites, 0);
  assert.match(report.document.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(report.document.markdown, undefined);
  assert.equal(JSON.stringify(report).includes('test-service-token'), false);
  assert.equal(calls[2].headers.authorization, 'Bearer test-service-token');
  assert.deepEqual(JSON.parse(calls[2].body).urls, [source]);
});
test('service failures redact underlying error values', async () => {
  const report = await validateCrawl4AIStaging({ env, live: true, fetchImpl: async () => { throw new Error('test-service-token'); } });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(JSON.stringify(report).includes('test-service-token'), false);
});
test('authorization probe has a bounded deadline', async () => {
  const report = await validateCrawl4AIStaging({ env, live: true, probeTimeoutMs: 10, fetchImpl: () => new Promise(() => {}) });
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.sourceCrawlAttempts, 0);
});
