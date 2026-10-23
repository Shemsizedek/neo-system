import test from 'node:test';
import assert from 'node:assert/strict';
import { crawlKnowindex, permittedUrl } from './knowindex-pilot.mjs';

const source = { id: 'world-library-knowindex', name: 'World Library', community: 'Indigenous and Moorish knowledge collections', url: 'https://holytemples.org/hy/world-library/', crawl: { maxDepth: 1, maxPages: 3, delayMs: 1500 } };
const response = (status, body, type = 'text/html') => ({ status, ok: status >= 200 && status < 300, headers: { get: () => type }, text: async () => body });
const fake = (robots, pages = {}) => async (url, options) => {
  assert.equal(options.redirect, 'manual');
  if (url.endsWith('/robots.txt')) return robots;
  return pages[url] || response(404, '');
};

test('rejects off-host, private, HTTP and sibling paths', () => {
  for (const url of ['http://holytemples.org/hy/world-library/', 'https://example.org/hy/world-library/', 'https://holytemples.org/hy/other/', 'https://holytemples.org/hy/world-library-evil/', 'https://localhost/hy/world-library/']) assert.equal(permittedUrl(url, source.url), false);
});

test('fails closed when robots is unavailable', async () => {
  await assert.rejects(crawlKnowindex(source, { fetcher: fake(response(503, '')), sleep: async () => {} }), /robots_unavailable/);
});

test('honors robots disallow', async () => {
  const result = await crawlKnowindex(source, { fetcher: fake(response(200, 'User-agent: *\nDisallow: /hy/world-library/')), sleep: async () => {} });
  assert.equal(result.crawled, 0);
});

test('indexes allowed subtree once, ignores external links', async () => {
  const root = source.url, child = root + 'article/';
  const calls = [];
  const underlying = fake(response(200, 'User-agent: *\nDisallow: /private/'), {
    [root]: response(200, '<title>Library</title><a href="/hy/world-library/article/">Article</a><a href="https://example.org/">external</a><a href="/hy/other/">other</a>'),
    [child]: response(200, '<title>Article</title>Knowledge')
  });
  const result = await crawlKnowindex(source, { fetcher: async (url, options) => { calls.push(url); return underlying(url, options); }, sleep: async () => {} });
  assert.equal(result.crawled, 2);
  assert.deepEqual(calls, ['https://holytemples.org/robots.txt', root, child]);
  assert.equal(result.records[0].contentHash.length, 64);
});

test('does not follow redirects', async () => {
  const result = await crawlKnowindex(source, { fetcher: fake(response(200, ''), { [source.url]: response(302, '') }), sleep: async () => {} });
  assert.equal(result.crawled, 0);
  assert.match(result.errors[0].error, /redirect_not_allowed/);
});


test('pins the approved source root regardless of registry changes', async () => {
  await assert.rejects(
    crawlKnowindex({ ...source, url: 'https://example.org/hy/world-library/' }, { fetcher: fake(response(200, '')), sleep: async () => {} }),
    /invalid_root/
  );
});

test('records robots and page provenance for a bounded successful crawl', async () => {
  const result = await crawlKnowindex(source, {
    fetcher: fake(response(200, 'User-agent: *\nDisallow: /private/'), { [source.url]: response(200, '<title>Library</title>Knowledge') }),
    sleep: async () => {}
  });
  assert.equal(result.crawled, 1);
  assert.equal(result.attemptedPages, 1);
  assert.equal(result.robots.status, 200);
  assert.equal(result.robots.sha256.length, 64);
  assert.equal(result.records[0].contentBytes, Buffer.byteLength('<title>Library</title>Knowledge'));
  assert.equal(result.records[0].httpStatus, 200);
});

test('caps page requests even when child pages fail', async () => {
  const child = source.url + 'missing/';
  const urls = [];
  const fetcher = fake(response(200, ''), {
    [source.url]: response(200, '<a href="missing/">A</a><a href="other/">B</a>'),
    [child]: response(500, '')
  });
  const result = await crawlKnowindex({ ...source, crawl: { ...source.crawl, maxPages: 2 } }, {
    fetcher: async (url, options) => { urls.push(url); return fetcher(url, options); },
    sleep: async () => {}
  });
  assert.equal(result.attemptedPages, 2);
  assert.equal(result.crawled, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(urls.length, 3);
});

test('rejects excessively large page responses without recording content', async () => {
  const result = await crawlKnowindex(source, {
    fetcher: fake(response(200, ''), { [source.url]: response(200, 'X'.repeat(2_000_001)) }),
    sleep: async () => {}
  });
  assert.equal(result.crawled, 0);
  assert.match(result.errors[0].error, /response_too_large/);
});
