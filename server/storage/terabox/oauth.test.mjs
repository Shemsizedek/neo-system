import test from 'node:test';
import assert from 'node:assert/strict';
import { __test, exchangeAuthorizationCode, tokenInfo } from './oauth.mjs';

function mockFetch(payload = { errno: 0, data: {} }) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify(payload); },
    };
  };
  return { fetchImpl, calls };
}

test('signature follows documented md5 client_timestamp_secret_private format', () => {
  const sign = __test.makeSign({ clientId: 'abc', timestamp: 1700000000, clientSecret: 'def', privateSecret: 'ghi' });
  assert.equal(sign, '1ec7f22bb15d8a89bfc2c43e246f1712');
});

test('authorization code exchange posts expected grant fields', async () => {
  const { fetchImpl, calls } = mockFetch({ errno: 0, data: { access_token: 'token' } });
  await exchangeAuthorizationCode({
    code: 'code-1',
    clientId: 'client-1',
    clientSecret: 'secret-1',
    privateSecret: 'private-1',
    timestamp: 1700000000,
    fetchImpl,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/oauth\/gettoken$/);
  assert.equal(calls[0].options.method, 'POST');
});

test('tokenInfo posts to token info endpoint', async () => {
  const { fetchImpl, calls } = mockFetch({ errno: 0, data: { api_domain: 'https://api.example' } });
  const result = await tokenInfo('access-1', { fetchImpl });
  assert.equal(result.data.api_domain, 'https://api.example');
  assert.match(calls[0].url, /\/oauth\/tokeninfo$/);
});
