import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyCesCrawler, inventoryLinks } from './ces-legacy-crawler.mjs';

test('inventoryLinks keeps only same-origin CES links and deduplicates', () => {
  const html = `
    <a href="/win/virtual.asp">Virtual Trader</a>
    <a href="https://www.community-exchange.org/win/virtual.asp">Duplicate</a>
    <a href="https://example.com/nope">External</a>`;
  const links = inventoryLinks(html, { pageUrl: 'https://www.community-exchange.org/win/home.asp' });
  assert.equal(links.length, 1);
  assert.equal(links[0].path, '/win/virtual.asp');
});

test('crawler emits a read-only discovery manifest', async () => {
  const request = async (path) => ({
    ok: true,
    status: 200,
    url: `https://www.community-exchange.org${path}`,
    async text() {
      return `<html><head><title>Virtual Trader</title></head><body>
        <h1>Virtual Trader</h1>
        <form method="post" action="/win/virtual.asp"><input name="amount" required></form>
        <a href="/win/stats.asp">Stats</a>
      </body></html>`;
    },
  });
  const crawler = createLegacyCesCrawler({
    request,
    surfaces: [{ key: 'virtual-trader', label: 'Virtual Trader', path: '/win/virtual.asp', risk: 'interexchange-read' }],
  });
  const manifest = await crawler.crawl({ exchangeId: 'NMNI', adminAccount: 'NMNI0000', bankAccount: 'NMNIBANK' });
  assert.equal(manifest.readOnly, true);
  assert.equal(manifest.pages[0].forms[0].method, 'POST');
  assert.equal(manifest.pages[0].writable, false);
  assert.equal(manifest.pages[0].forms[0].fingerprint.startsWith('fnv1a-'), true);
});

test('crawler marks unknown routes without requesting them', async () => {
  let calls = 0;
  const crawler = createLegacyCesCrawler({
    request: async () => { calls += 1; throw new Error('should not request'); },
    surfaces: [{ key: 'transactions', label: 'Transactions', path: null, risk: 'financial-read' }],
  });
  const manifest = await crawler.crawl({ exchangeId: 'XCPC', adminAccount: 'XCPC0000', bankAccount: 'XCPCBANK' });
  assert.equal(calls, 0);
  assert.equal(manifest.pages[0].status, 'route-unknown');
});
