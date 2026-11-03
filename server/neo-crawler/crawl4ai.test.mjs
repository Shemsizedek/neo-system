import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCrawl4AIAdapter, createCrawl4AICrawler } from './crawl4ai.mjs';
import { createCrawlerWorker } from './worker.mjs';
import { fingerprintCrawlerEnvelope, createEvidenceVaultSink } from './persistence.mjs';

const url = 'https://holytemples.org/world-library/';
const valid = { success: true, results: [{ success: true, status_code: 200, url,
  markdown: { raw_markdown: '# World Library\nPublic source text.' }, metadata: { title: 'World Library' } }] };
const response = body => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const config = (extra = {}) => ({ serviceOrigin: 'http://127.0.0.1:11235', apiToken: 'test-service-token',
  allowedOrigins: ['https://holytemples.org'], lookupImpl: async () => [{ address: '93.184.216.34' }],
  fetchImpl: async () => response(valid), ...extra });

test('requires scoped service configuration', () => {
  for (const extra of [
    { apiToken: '' }, { allowedOrigins: [] }, { serviceOrigin: 'http://remote.example.net' },
    { serviceOrigin: 'https://user:secret@crawler.example.net' }, { serviceOrigin: 'https://crawler.example.net/api' },
    { allowedOrigins: ['https://holytemples.org/path'] }, { maxResponseBytes: Infinity },
  ]) assert.throws(() => createCrawl4AIAdapter(config(extra)));
});
test('rejects disallowed source URLs before sending requests', async () => {
  let calls = 0;
  for (const target of ['http://holytemples.org', 'file:///etc/passwd', 'https://127.0.0.1',
    'https://[::1]', 'https://user:pass@holytemples.org', 'https://holytemples.org:8443',
    'https://holytemples.org.evil.com', 'https://unlisted.org']) {
    const adapter = createCrawl4AIAdapter(config({ fetchImpl: async () => { calls++; return response(valid); } }));
    await assert.rejects(adapter({ url: target }));
  }
  assert.equal(calls, 0);
});
test('rejects private, special, mixed and unsupported IPv6 DNS answers', async () => {
  let calls = 0;
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1',
    '192.168.1.1', '198.18.0.1', '203.0.113.1', '224.0.0.1', '::ffff:127.0.0.1', '2606:4700::1111']) {
    const adapter = createCrawl4AIAdapter(config({ lookupImpl: async () => [{ address: '93.184.216.34' }, { address }],
      fetchImpl: async () => { calls++; return response(valid); } }));
    await assert.rejects(adapter({ url }), /source_not_allowed/);
  }
  assert.equal(calls, 0);
});
test('uses fixed upstream configuration and never forwards job hooks or credentials', async () => {
  let request;
  const adapter = createCrawl4AIAdapter(config({ fetchImpl: async (endpoint, options) => {
    request = { endpoint: String(endpoint), options, body: JSON.parse(options.body) };
    return response(valid);
  } }));
  await adapter({ url, hooks: { code: 'execute' }, options: { check_robots_txt: false }, apiToken: 'job-secret',
    crawler_config: { js_code: 'execute' }, evidenceState: 'verified' });
  assert.equal(request.endpoint, 'http://127.0.0.1:11235/crawl');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.authorization, 'Bearer test-service-token');
  assert.deepEqual(request.body.urls, [url]);
  assert.equal(request.body.crawler_config.params.check_robots_txt, true);
  assert.deepEqual(request.body.crawler_config.params.cache_mode, { type: 'CacheMode', params: 'bypass' });
  assert.equal(request.body.browser_config.params.java_script_enabled, false);
  assert.equal(request.body.hooks, undefined);
  assert.equal(JSON.stringify(request.body).includes('job-secret'), false);
  assert.equal(request.body.crawler_config.params.js_code, undefined);
});
test('normalizes Noogle document schema with explicit hash scope and no evidence promotion', async () => {
  const crawler = createCrawl4AICrawler(config({ now: () => Date.parse('2026-11-03T12:00:00Z') }));
  const envelope = await crawler.crawl({ adapter: 'crawl4ai', url: url + '#section', evidenceState: 'verified' });
  const doc = envelope.result;
  assert.equal(doc.url, url);
  assert.equal(doc.canonicalUrl, url);
  assert.equal(doc.evidenceState, 'unverified');
  assert.equal(doc.retrievedAt, '2026-11-03T12:00:00.000Z');
  assert.equal(doc.contentHash, createHash('sha256').update(doc.markdown).digest('hex'));
  assert.equal(doc.contentHashScope, 'extracted-markdown-utf8');
  assert.equal(envelope.classification.lmsPublicationAutomatic, false);
  assert.equal(fingerprintCrawlerEnvelope(envelope)[0].contentHash, doc.contentHash);
});
test('rejects upstream failures, redirects, unrelated results and missing extraction', async () => {
  const original = valid.results[0];
  for (const body of [
    { success: false }, { success: true, results: [] }, { success: true, results: [original, original] },
    { success: true, results: [{ ...original, success: false }] },
    { success: true, results: [{ ...original, status_code: 403 }] },
    { success: true, results: [{ ...original, url: 'https://evil.com/' }] },
    { success: true, results: [{ ...original, redirected_url: 'https://holytemples.org/login/' }] },
    { success: true, results: [{ ...original, markdown: null }] },
  ]) {
    await assert.rejects(createCrawl4AIAdapter(config({ fetchImpl: async () => response(body) }))({ url }));
  }
});
test('bounds streaming response and markdown bytes', async () => {
  await assert.rejects(createCrawl4AIAdapter(config({ maxResponseBytes: 10 }))({ url }), /response_too_large/);
  await assert.rejects(createCrawl4AIAdapter(config({ maxMarkdownBytes: 5 }))({ url }), /markdown_too_large/);
});
test('rejects HTTP and invalid JSON without logging sensitive response data', async () => {
  for (const fetchImpl of [
    async () => new Response('test-service-token', { status: 500 }),
    async () => new Response('test-service-token', { headers: { 'content-type': 'text/plain' } }),
    async () => new Response('test-service-token', { headers: { 'content-type': 'application/json' } }),
    async () => { throw new Error('failed: test-service-token'); },
  ]) await assert.rejects(createCrawl4AIAdapter(config({ fetchImpl }))({ url }), error => !error.message.includes('test-service-token'));
});
test('applies one deadline to DNS, fetch and response-body reads', async () => {
  for (const extra of [
    { lookupImpl: () => new Promise(() => {}) },
    { fetchImpl: () => new Promise(() => {}) },
    { fetchImpl: async () => new Response(new ReadableStream({ start() {}, cancel() {} }),
      { headers: { 'content-type': 'application/json' } }) },
  ]) await assert.rejects(createCrawl4AIAdapter(config({ ...extra, timeoutMs: 10 }))({ url }), /timeout/);
});
test('limits concurrent and rapid repeated calls', async () => {
  let release;
  let clock = 1000;
  const adapter = createCrawl4AIAdapter(config({ now: () => clock,
    fetchImpl: () => new Promise(resolve => { release = () => resolve(response(valid)); }) }));
  const pending = adapter({ url });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  await assert.rejects(adapter({ url }), /rate_limited/);
  release();
  await pending;
  await assert.rejects(adapter({ url }), /rate_limited/);
});
test('worker persists evidence then routes the Crawl4AI envelope without publishing', async () => {
  const records = new Map();
  const vault = { getEvidence: id => records.get(id), createEvidence: record => { records.set(record.id, record); return record; } };
  let routed, completed;
  const queue = { claim: async () => ({ id: 'job-1', claimToken: 'lease', input: { adapter: 'crawl4ai', url }, meta: {} }),
    complete: async (...args) => { completed = args; }, fail: async (_, error) => { throw error; } };
  const worker = createCrawlerWorker({ queue, crawler: createCrawl4AICrawler(config()),
    evidenceSink: createEvidenceVaultSink(vault), routeEvent: async event => { routed = event; return { mission: { id: 'mission-1' } }; } });
  const result = await worker.runOnce();
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.evidenceCount, 1);
  assert.equal(routed.sourceMeta.adapter, 'crawl4ai');
  assert.equal(routed.governance.lmsPublicationAutomatic, false);
  assert.equal(completed[2], 'lease');
  assert.equal(records.values().next().value.claimType, 'RESEARCH_INPUT');
  assert.equal(JSON.parse(records.values().next().value.note).contentHashScope, 'extracted-markdown-utf8');
});
test('factory does not enable Crawl4AI on the shared default registry', async () => {
  const { neoCrawler } = await import('./index.mjs');
  assert.equal(neoCrawler.capabilities().adapters.includes('crawl4ai'), false);
});
