import test from 'node:test';
import assert from 'node:assert/strict';
import { createCesSessionAdapter, defaultSessionValidator } from './ces-session-adapter.mjs';
import { createEnvCesCredentialProvider } from './deployment-secrets.mjs';
import { NMNI_READ_LOGIN_PROFILE, createNmniReadCredentialProvider, nmniReadiness } from './nmni-login-profile.mjs';

const baseUrl = 'https://www.community-exchange.org';
const protectedHtml = '<h1>Noocratic Open Market Nibiru Index</h1><a href="logout.asp">Log Out</a>';
const loginHtml = '<form method="POST" action="https://www.community-exchange.org/rlogin.asp"><input name="uid"><input name="passwd" type="password"><button name="action" value="login">Log In</button></form>';
const credentials = NMNI_READ_LOGIN_PROFILE;
const redirect = () => new Response('', { status: 302, headers: { location: '/memac.asp?off=2' } });
const validate = (options = {}) => defaultSessionValidator({ response: redirect(), credentials, baseUrl, request: async () => new Response(protectedHtml), ...options });

test('an HTTP 200 login page without verification cannot authenticate', async () => {
  const result = await validate({ response: new Response(loginHtml), credentials: {} });
  assert.equal(result.authenticated, false);
  assert.equal(result.reason, 'protected-page-verification-required');
});

test('a matching redirect alone cannot authenticate an expired session', async () => {
  const result = await validate({ request: async () => new Response('', { status: 302, headers: { location: '/home/user-login/' } }) });
  assert.equal(result.authenticated, false);
});

test('protected-page marker and successful response establish authentication', async () => {
  const calls = [];
  const result = await validate({ request: async (url, options) => { calls.push([url, options.method]); return new Response(protectedHtml); } });
  assert.equal(result.authenticated, true);
  assert.deepEqual(calls, [[baseUrl + '/memac.asp', 'GET']]);
});

test('login form and missing exchange marker are rejected', async () => {
  for (const body of [loginHtml + protectedHtml, '<h1>Another exchange</h1>']) {
    assert.equal((await validate({ request: async () => new Response(body) })).authenticated, false);
  }
});

test('cross-origin or credential-bearing login redirects never trigger a probe', async () => {
  for (const location of ['https://evil.example/memac.asp', '//evil.example/memac.asp', 'https://user:secret@www.community-exchange.org/memac.asp']) {
    let probes = 0;
    const result = await validate({ response: new Response('', { status: 302, headers: { location } }), request: async () => { probes++; return new Response(protectedHtml); } });
    assert.equal(result.authenticated, false);
    assert.equal(probes, 0);
  }
});

test('untrusted probe targets and HTTP failures fail closed', async () => {
  for (const authenticatedPath of ['https://evil.example/member', 'http://www.community-exchange.org/memac.asp']) {
    assert.equal((await validate({ credentials: { ...credentials, authenticatedPath }, request: () => { throw new Error('must not probe'); } })).authenticated, false);
  }
  assert.equal((await validate({ response: new Response('', { status: 403 }) })).authenticated, false);
  assert.equal((await validate({ request: async () => new Response(protectedHtml, { status: 403 }) })).authenticated, false);
});

test('a mismatched or missing redirect cannot authenticate', async () => {
  for (const headers of [{ location: '/login.asp?error=1' }, {}]) {
    assert.equal((await validate({ response: new Response('', { status: 302, headers }) })).authenticated, false);
  }
});

test('missing protected-page configuration blocks credential submission', async () => {
  let calls = 0;
  const adapter = createCesSessionAdapter({ fetchImpl: async () => { calls++; return new Response(loginHtml); }, credentialProvider: async () => ({ username: 'fixture', password: 'fixture' }) });
  await assert.rejects(() => adapter.login({ exchangeId: 'NMNI' }), /verification is not configured/);
  assert.equal(calls, 0);
});

test('NMNI verified form logs in and probes with its cookie without exposing credentials', async () => {
  const calls = [];
  const adapter = createCesSessionAdapter({
    credentialProvider: createNmniReadCredentialProvider({ NEO_CES_NMNI_USERNAME: 'fixture', NEO_CES_NMNI_PASSWORD: 'fixture-secret' }),
    fetchImpl: async (url, options = {}) => {
      calls.push({ url: String(url), options });
      if (options.method === 'POST') return new Response('', { status: 302, headers: { location: '/memac.asp?off=2', 'set-cookie': 'ASPSESSIONID=fixture-cookie; Secure; HttpOnly; Path=/' } });
      return new Response(String(url).endsWith('/memac.asp') ? protectedHtml : loginHtml);
    },
  });
  const result = await adapter.login({ exchangeId: 'NMNI', adminAccount: 'NMNI0000', bankAccount: 'NMNIBANK' });
  assert.equal(result.authenticated, true);
  assert.equal(calls[1].url, baseUrl + '/rlogin.asp');
  assert.deepEqual(Object.fromEntries(calls[1].options.body), { uid: 'fixture', passwd: 'fixture-secret', action: 'login' });
  assert.equal(calls[2].options.headers.get('cookie'), 'ASPSESSIONID=fixture-cookie');
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret|fixture-cookie/);
});

test('NMNI preflight is secret-free and does not claim authentication or admin access', async () => {
  const env = { NEO_CES_NMNI_USERNAME: 'fixture', NEO_CES_NMNI_PASSWORD: 'fixture-secret' };
  const status = nmniReadiness(env);
  assert.equal(status.credentialsConfigured, true);
  assert.equal(status.authenticationVerified, false);
  assert.equal(status.adminAccessVerified, false);
  assert.equal(status.liveExecutionEnabled, false);
  assert.doesNotMatch(JSON.stringify(status), /fixture-secret/);
  assert.equal(nmniReadiness({}).missingSecrets.length, 2);
  await assert.rejects(() => createNmniReadCredentialProvider(env)({ exchangeId: 'OTHER' }), /another exchange/);
  await assert.rejects(() => createNmniReadCredentialProvider({})({ exchangeId: 'NMNI' }), /not configured/);
});

test('generic credential provider requires protected-page verification settings', async () => {
  const provider = createEnvCesCredentialProvider({ NEO_CES_NMNI_USERNAME: 'fixture', NEO_CES_NMNI_PASSWORD: 'fixture', NEO_CES_NMNI_LOGIN_PATH: '/login.asp', NEO_CES_NMNI_SUCCESS_LOCATION_PATTERN: '^/memac' });
  await assert.rejects(() => provider({ exchangeId: 'NMNI' }), /protected-page verification is not configured/);
});

test('session adapter rejects HTTP and embedded-credential base URLs', () => {
  for (const baseUrl of ['http://www.community-exchange.org', 'https://user:secret@www.community-exchange.org']) {
    assert.throws(() => createCesSessionAdapter({ baseUrl, credentialProvider: async () => ({}) }), /HTTPS without embedded credentials/);
  }
});
