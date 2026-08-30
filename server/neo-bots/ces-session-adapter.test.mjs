import test from 'node:test';
import assert from 'node:assert/strict';
import { createCesSessionAdapter, createMemoryCookieJar } from './ces-session-adapter.mjs';
import { createMemoryCesManifestStore } from './ces-manifest-store.mjs';
import { resolveCesIdentity } from './bank-bot.mjs';

function response(body = '', { status = 200, headers = {}, url } = {}) {
  const res = new Response(body, { status, headers });
  if (url) Object.defineProperty(res, 'url', { value: url });
  return res;
}

const validatedSession = async () => ({ authenticated: true, reason: 'test-session' });

test('CES adapter authenticates using injected credentials without persisting secrets', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if ((options.method || 'GET') === 'GET') return response('<input value="abc123" name="csrfToken" type="hidden">', { headers: { 'set-cookie': 'ASPSESSIONID=xyz; Path=/; HttpOnly' } });
    return response('', { status: 302, headers: { location: '/win/home.asp' } });
  };
  const adapter = createCesSessionAdapter({
    fetchImpl,
    sessionValidator: validatedSession,
    credentialProvider: async (exchange) => ({ username: exchange.adminAccount, password: 'secret-from-vault', loginPath: '/login.asp', submitPath: '/login.asp', usernameField: 'account', passwordField: 'password', csrfField: 'csrfToken' }),
  });
  const result = await adapter.login(resolveCesIdentity('NMNI'));
  assert.equal(result.authenticated, true);
  assert.equal(calls.length, 2);
  assert.match(String(calls[1].options.body), /account=NMNI0000/);
  assert.match(String(calls[1].options.body), /csrfToken=abc123/);
  assert.match(calls[1].options.headers.get('cookie'), /ASPSESSIONID=xyz/);
});

test('CES adapter blocks cross-origin login and session requests', async () => {
  let calls = 0;
  const adapter = createCesSessionAdapter({
    fetchImpl: async () => { calls += 1; return response(''); },
    credentialProvider: async () => ({ username: 'NMNI0000', password: 'vault-secret', loginPath: 'https://evil.example/login' }),
  });
  await assert.rejects(() => adapter.login(resolveCesIdentity('NMNI')), /cross-origin request blocked/);
  assert.equal(calls, 0);
});

test('cookie jar retains multiple cookies and replaces duplicate names', () => {
  const jar = createMemoryCookieJar();
  const url = new URL('https://www.community-exchange.org/');
  const first = { headers: { getSetCookie: () => ['ASPSESSIONID=one; Path=/', 'CESMODE=legacy; Path=/'] } };
  const second = { headers: { getSetCookie: () => ['ASPSESSIONID=two; Path=/'] } };
  jar.storeFromResponse(url, first);
  jar.storeFromResponse(url, second);
  const header = jar.getCookieHeader(url);
  assert.match(header, /ASPSESSIONID=two/);
  assert.match(header, /CESMODE=legacy/);
  assert.doesNotMatch(header, /ASPSESSIONID=one/);
});

test('login fails closed when authenticated session cannot be validated', async () => {
  const adapter = createCesSessionAdapter({
    fetchImpl: async (url, options = {}) => (options.method === 'POST' ? response('', { status: 302 }) : response('<form></form>')),
    credentialProvider: async () => ({ username: 'NMNI0000', password: 'vault-secret' }),
  });
  await assert.rejects(() => adapter.login(resolveCesIdentity('NMNI')), /did not validate an authenticated session/);
});

test('Virtual Trader review remains read-only', async () => {
  let postCount = 0;
  const fetchImpl = async (url, options = {}) => {
    if ((options.method || 'GET') === 'POST') postCount += 1;
    if (String(url).includes('/win/virtual.asp')) return response('<h1>Virtual Trader</h1>');
    return response('<form></form>');
  };
  const adapter = createCesSessionAdapter({ fetchImpl, sessionValidator: validatedSession, credentialProvider: async () => ({ username: 'NMNI0000', password: 'vault-secret' }) });
  const result = await adapter.reviewVirtualTrader({ exchange: resolveCesIdentity('NMNI') });
  assert.equal(result.operation, 'reviewVirtualTrader');
  assert.equal(result.pageDetected, true);
  assert.equal(postCount, 1, 'the only POST should be the login attempt');
});

test('legacy control-panel discovery persists a reusable manifest', async () => {
  const store = createMemoryCesManifestStore();
  let postCount = 0;
  const fetchImpl = async (url, options = {}) => {
    const method = options.method || 'GET';
    if (method === 'POST') { postCount += 1; return response('', { status: 302 }); }
    const target = String(url);
    if (target.includes('/win/virtual.asp')) return response('<title>Virtual Trader</title><h1>Virtual Trader</h1><a href="/win/stats.asp">Stats</a>', { url: target });
    return response('<title>CES Login</title><form method="post" action="/login.asp"><input name="account"></form>', { url: target });
  };
  const adapter = createCesSessionAdapter({ fetchImpl, manifestStore: store, sessionValidator: validatedSession, credentialProvider: async () => ({ username: 'NMNI0000', password: 'vault-secret' }) });
  const exchange = resolveCesIdentity('NMNI');
  const result = await adapter.discoverLegacyControlPanel(exchange);
  const persisted = await adapter.getLegacyDiscoveryManifest('NMNI');
  assert.equal(result.mode, 'legacy-discovery-read-only');
  assert.equal(result.persisted, true);
  assert.equal(result.manifest.readOnly, true);
  assert.equal(result.manifest.exchange.adminAccount, 'NMNI0000');
  assert.equal(persisted.exchange.bankAccount, 'NMNIBANK');
  assert.equal(persisted.interface, 'legacy');
  assert.equal(postCount, 1, 'discovery must not submit any POST after login');
});
