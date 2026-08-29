import test from 'node:test';
import assert from 'node:assert/strict';
import { createCesSessionAdapter } from './ces-session-adapter.mjs';
import { resolveCesIdentity } from './bank-bot.mjs';

function response(body = '', { status = 200, headers = {} } = {}) {
  return new Response(body, { status, headers });
}

test('CES adapter authenticates using injected credentials without persisting secrets', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if ((options.method || 'GET') === 'GET') {
      return response('<input type="hidden" name="csrfToken" value="abc123">', {
        headers: { 'set-cookie': 'ASPSESSIONID=xyz; Path=/; HttpOnly' },
      });
    }
    return response('', { status: 302 });
  };

  const adapter = createCesSessionAdapter({
    fetchImpl,
    credentialProvider: async (exchange) => ({
      username: exchange.adminAccount,
      password: 'secret-from-vault',
      loginPath: '/login.asp',
      submitPath: '/login.asp',
      usernameField: 'account',
      passwordField: 'password',
      csrfField: 'csrfToken',
    }),
  });

  const result = await adapter.login(resolveCesIdentity('NMNI'));
  assert.equal(result.authenticated, true);
  assert.equal(calls.length, 2);
  assert.match(String(calls[1].options.body), /account=NMNI0000/);
  assert.match(String(calls[1].options.body), /csrfToken=abc123/);
  assert.match(calls[1].options.headers.get('cookie'), /ASPSESSIONID=xyz/);
});

test('Virtual Trader review remains read-only', async () => {
  let postCount = 0;
  const fetchImpl = async (url, options = {}) => {
    if ((options.method || 'GET') === 'POST') postCount += 1;
    if (String(url).includes('/win/virtual.asp')) return response('<h1>Virtual Trader</h1>');
    return response('<form></form>');
  };

  const adapter = createCesSessionAdapter({
    fetchImpl,
    credentialProvider: async () => ({ username: 'NMNI0000', password: 'vault-secret' }),
  });

  const result = await adapter.reviewVirtualTrader({ exchange: resolveCesIdentity('NMNI') });
  assert.equal(result.operation, 'reviewVirtualTrader');
  assert.equal(result.pageDetected, true);
  assert.equal(postCount, 1, 'the only POST should be the login attempt');
});
