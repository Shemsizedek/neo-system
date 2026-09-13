import test from 'node:test';
import assert from 'node:assert/strict';
import { createCesSessionAdapter, validateCesLoginContract } from './ces-session-adapter.mjs';

const loginHtml = `
<html><body>
  <form method="post" action="/login.asp">
    <input type="text" name="account">
    <input type="password" name="password">
  </form>
</body></html>`;

test('validateCesLoginContract accepts only the exact configured POST action and fields', () => {
  const result = validateCesLoginContract(loginHtml, {
    pageUrl: 'https://www.community-exchange.org/login.asp',
    submitUrl: 'https://www.community-exchange.org/login.asp',
    usernameField: 'account',
    passwordField: 'password',
  });

  assert.equal(result.ok, true);
  assert.equal(result.method, 'POST');
  assert.equal(result.action, 'https://www.community-exchange.org/login.asp');
  assert.equal(result.usernameField, 'account');
  assert.equal(result.passwordField, 'password');
  assert.equal(result.fingerprint.startsWith('fnv1a-'), true);
});

test('validateCesLoginContract rejects unverified credential field names', () => {
  assert.throws(() => validateCesLoginContract(loginHtml, {
    pageUrl: 'https://www.community-exchange.org/login.asp',
    submitUrl: 'https://www.community-exchange.org/login.asp',
    usernameField: 'username',
    passwordField: 'password',
  }), /CES login contract mismatch/);
});

test('session adapter does not POST credentials when the discovered login contract mismatches configuration', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET' });
    return new Response(loginHtml, {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });
  };

  const adapter = createCesSessionAdapter({
    fetchImpl,
    credentialProvider: async () => ({
      username: 'NMNI0000',
      password: 'not-a-real-secret',
      loginPath: '/login.asp',
      submitPath: '/login.asp',
      usernameField: 'username',
      passwordField: 'password',
      successLocationPattern: '^/memac\\.asp(?:\\?.*)?$',
    }),
  });

  await assert.rejects(
    () => adapter.login({ exchangeId: 'NMNI', adminAccount: 'NMNI0000', bankAccount: 'NMNIBANK' }),
    /CES login contract mismatch/,
  );

  assert.deepEqual(calls.map((call) => call.method), ['GET']);
});
