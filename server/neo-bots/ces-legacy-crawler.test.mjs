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

test('default legacy discovery pins the public login route and never submits credentials', async () => {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({ path, method: options.method });
    return {
      ok: true,
      status: 200,
      url: `https://www.community-exchange.org${path}`,
      async text() {
        if (path === '/login.asp') {
          return `<html><head><title>User Login</title></head><body>
            <form method="post" action="/login.asp">
              <input name="account" type="text">
              <input name="password" type="password">
            </form>
          </body></html>`;
        }
        return '<html><body>Virtual Trader</body></html>';
      },
    };
  };
  const crawler = createLegacyCesCrawler({ request });
  const manifest = await crawler.crawl({ exchangeId: 'NMNI', adminAccount: 'NMNI0000', bankAccount: 'NMNIBANK' });
  const login = manifest.pages.find((page) => page.key === 'login');
  assert.equal(calls[0].path, '/login.asp');
  assert.equal(calls.every((call) => call.method === 'GET'), true);
  assert.equal(login.finalUrl, 'https://www.community-exchange.org/login.asp');
  assert.equal(login.forms[0].action, 'https://www.community-exchange.org/login.asp');
  assert.deepEqual(login.forms[0].fieldNames, ['account', 'password']);
  assert.equal(login.writable, false);
  assert.equal(login.discoveryOnly, true);
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


test('discovery never persists password-bearing links, forms or redirects', async () => {
  const secret = 'SYNTHETIC_TEST_SECRET_NEVER_REAL';
  const html = '<h1>Admin</h1>' +
    '<a href="/rlogin.asp?uid=example&pw='+secret+'">User Login</a>' +
    '<a href="/_admin/reptrades.asp">Safe Report</a>' +
    '<form method="POST" action="/_admin/tx.asp?pw='+secret+'"><input name="amount"></form>' +
    '<form method="GET" action="/_admin/reptrades.asp"><input name="sort"></form>';
  const links = inventoryLinks(html, { pageUrl:'https://www.community-exchange.org/_admin/admain.asp' });
  assert.deepEqual(links.map(link => link.path), ['/_admin/reptrades.asp']);
  const crawler = createLegacyCesCrawler({
    request: async () => ({
      ok:true, status:200,
      url:'https://www.community-exchange.org/_admin/admain.asp',
      text: async () => html,
    }),
    surfaces:[{ key:'manage', label:'Manage', path:'/_admin/admain.asp', risk:'admin-read' }],
  });
  const result=await crawler.crawl({exchangeId:'NMNI',adminAccount:'NMNI0000',bankAccount:'NMNIBANK'});
  assert.equal(result.pages[0].forms.length,1);
  assert.equal(result.pages[0].forms[0].method,'GET');
  assert.doesNotMatch(JSON.stringify(result), new RegExp(secret));
  const bad = createLegacyCesCrawler({
    request: async () => ({ok:true,status:200,url:'https://www.community-exchange.org/_admin/admain.asp?pw='+secret,text:async()=>html}),
    surfaces:[{key:'manage',label:'Manage',path:'/_admin/admain.asp',risk:'admin-read'}],
  });
  await assert.rejects(()=>bad.crawl({exchangeId:'NMNI'}), /Unsafe CES discovery response URL/);
});
