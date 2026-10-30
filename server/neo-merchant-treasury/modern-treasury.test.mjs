import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { createModernTreasuryConnector } from './modern-treasury.mjs';
import { createTreasuryServer } from './server.mjs';
import { checkModernTreasury } from '../../scripts/check-modern-treasury.mjs';

const ORGANIZATION = '00000000-0000-4000-8000-000000000001';
const SECRET = 'test-fixture-secret-not-a-real-api-key';
const env = { MODERN_TREASURY_ORGANIZATION_ID: ORGANIZATION, MODERN_TREASURY_API_KEY: SECRET };
const key = (changes = {}) => ({
  object: 'api_key', organization_id: ORGANIZATION, live_mode: false,
  decommissioned: false, roles: ['accounts:read', 'developer:read'], ...changes
});
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', ...headers }
});
function fixture({ keyChanges, accounts = [], cursor, respond, ...options } = {}) {
  const calls = [];
  const connector = createModernTreasuryConnector({
    env, now: () => '2026-10-29T12:00:00.000Z', ...options,
    fetchImpl: async (url, init) => {
      const parsed = new URL(url);
      calls.push({ url: parsed, init });
      if (respond) return respond(parsed, init);
      if (parsed.pathname === '/api/api_keys/current') return response(key(keyChanges));
      if (parsed.pathname === '/api/ping') return response({ ping: 'pong' });
      if (parsed.pathname === '/api/internal_accounts') return response(accounts, 200, cursor ? { 'x-after-cursor': cursor } : {});
      throw new Error('Unexpected upstream request');
    }
  });
  return { connector, calls };
}
const account = (changes = {}) => ({
  object: 'internal_account', id: 'sandbox-account-1', currency: 'USD', live_mode: false,
  name: 'private display name', party_name: 'private legal name', party_address: { line1: 'private address' },
  account_details: [{ account_number: 'private-account-number' }],
  routing_details: [{ routing_number: 'private-routing-number' }],
  metadata: { api_key: SECRET }, ...changes
});

test('unconfigured connector reports configuration without making requests', async () => {
  const { connector, calls } = fixture({ env: {} });
  assert.equal(connector.status().state, 'not_configured');
  assert.deepEqual(connector.status().missing_variables, ['MODERN_TREASURY_ORGANIZATION_ID', 'MODERN_TREASURY_API_KEY']);
  await assert.rejects(connector.verifyConnection(), { code: 'modern_treasury_credentials_missing', status: 503 });
  assert.equal(calls.length, 0);
});

test('invalid environment, credentials and timeouts fail before sending credentials', async () => {
  for (const options of [
    { env: { ...env, MODERN_TREASURY_ENVIRONMENT: 'production' } },
    { env: { ...env, MODERN_TREASURY_ORGANIZATION_ID: 'wrong:identity' } },
    { env: { ...env, MODERN_TREASURY_API_KEY: 'bad\r\ncredential' } },
    { timeoutMs: 0 }, { timeoutMs: 30001 }, { timeoutMs: 1.5 }
  ]) {
    const { connector, calls } = fixture(options);
    assert.equal(connector.status().configured, false);
    await assert.rejects(connector.verifyConnection(), { code: 'modern_treasury_configuration_invalid' });
    assert.equal(calls.length, 0);
  }
});

test('successful verification uses fixed HTTPS origin, Basic auth, GET and no redirects', async () => {
  const { connector, calls } = fixture({ env: { ...env, MODERN_TREASURY_BASE_URL: 'http://untrusted.invalid' } });
  assert.equal(connector.status().state, 'not_verified');
  const result = await connector.verifyConnection();
  assert.equal(result.state, 'verified');
  assert.equal(result.last_verified_at, '2026-10-29T12:00:00.000Z');
  assert.equal(result.payment_execution_enabled, false);
  assert.equal(result.read_only, true);
  assert.deepEqual(calls.map(call => call.url.pathname), ['/api/api_keys/current', '/api/ping']);
  for (const { url, init } of calls) {
    assert.equal(url.origin, 'https://app.moderntreasury.com');
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'error');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.headers.authorization, `Basic ${Buffer.from(`${ORGANIZATION}:${SECRET}`).toString('base64')}`);
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.body, undefined);
  }
  assert.ok(!JSON.stringify(result).includes(SECRET));
  assert.ok(!JSON.stringify(result).includes(ORGANIZATION));
});

test('live, ambiguous, archived, foreign-organization and overprivileged keys are rejected', async () => {
  for (const [keyChanges, code] of [
    [{ live_mode: true }, 'modern_treasury_sandbox_key_required'],
    [{ live_mode: undefined }, 'modern_treasury_sandbox_key_required'],
    [{ live_mode: 'false' }, 'modern_treasury_sandbox_key_required'],
    [{ object: 'unexpected' }, 'modern_treasury_sandbox_key_required'],
    [{ organization_id: 'another-org' }, 'modern_treasury_key_identity_invalid'],
    [{ decommissioned: true }, 'modern_treasury_key_identity_invalid'],
    [{ decommissioned: undefined }, 'modern_treasury_key_identity_invalid'],
    [{ roles: ['accounts:manage'] }, 'modern_treasury_read_only_key_required'],
    [{ roles: ['accounts:read', 'payment_orders:manage'] }, 'modern_treasury_read_only_key_required'],
    [{ roles: ['api:manage_all'] }, 'modern_treasury_read_only_key_required'],
    [{ roles: [] }, 'modern_treasury_read_only_key_required'],
    [{ roles: undefined }, 'modern_treasury_read_only_key_required'],
    [{ roles: [123] }, 'modern_treasury_read_only_key_required'],
    [{ roles: ['developer:read'] }, 'modern_treasury_accounts_read_permission_required']
  ]) {
    const { connector, calls } = fixture({ keyChanges });
    await assert.rejects(connector.listInternalAccounts(), { code });
    assert.equal(calls.length, 1, 'No ping or account data is requested with a rejected key');
    assert.equal(connector.status().state, 'verification_failed');
  }
});

test('documented account-scoped read role is accepted', async () => {
  const { connector } = fixture({ keyChanges: { roles: [`accounts:read:${ORGANIZATION}`, 'developer:read'] } });
  assert.equal((await connector.verifyConnection()).state, 'verified');
});

test('account discovery projects only IDs, currencies and sandbox mode', async () => {
  const { connector, calls } = fixture({ accounts: [account()] });
  const result = await connector.listInternalAccounts({ perPage: 10, currency: 'USD', afterCursor: 'opaque/+==.?&x=y' });
  assert.deepEqual(result.accounts, [{ id: 'sandbox-account-1', currency: 'USD', live_mode: false }]);
  const query = calls.at(-1).url.searchParams;
  assert.equal(query.get('per_page'), '10');
  assert.equal(query.get('currency'), 'USD');
  assert.equal(query.get('after_cursor'), 'opaque/+==.?&x=y');
  assert.equal(query.has('x'), false);
  assert.equal(result.pagination.complete, true);
  assert.equal(result.pagination.next_after_cursor, null);
  assert.ok(!JSON.stringify(result).includes('private'));
  assert.ok(!JSON.stringify(result).includes(SECRET));
});

test('pagination follows X-After-Cursor, including empty and short pages', async () => {
  for (const accounts of [[], [account()]]) {
    const { connector } = fixture({ accounts, cursor: 'next/opaque+cursor=' });
    const result = await connector.listInternalAccounts({ perPage: 25 });
    assert.equal(result.pagination.complete, false);
    assert.equal(result.pagination.next_after_cursor, 'next/opaque+cursor=');
  }
});

test('invalid queries are rejected locally and key verification repeats before each page', async () => {
  const { connector, calls } = fixture();
  for (const query of [{ perPage: 0 }, { perPage: 101 }, { perPage: '25' }, { perPage: NaN },
    { perPage: 1.1 }, { afterCursor: '' }, { afterCursor: 'bad\nvalue' }, { afterCursor: 'a'.repeat(2049) },
    { afterCursor: 12 }, { currency: 'usd' }, { currency: 'USD&x=1' }]) {
    await assert.rejects(connector.listInternalAccounts(query), { code: 'modern_treasury_invalid_query', status: 400 });
  }
  assert.equal(calls.length, 0);
  await connector.listInternalAccounts();
  await connector.listInternalAccounts({ afterCursor: 'next-cursor' });
  assert.deepEqual(calls.map(call => call.url.pathname), [
    '/api/api_keys/current', '/api/ping', '/api/internal_accounts',
    '/api/api_keys/current', '/api/ping', '/api/internal_accounts'
  ]);
});

test('account data is rejected when sandbox identity or response schema cannot be verified', async () => {
  for (const [accounts, code] of [
    [[account({ live_mode: true })], 'modern_treasury_sandbox_account_required'],
    [[account(), account({ live_mode: undefined })], 'modern_treasury_sandbox_account_required'],
    [[account({ object: 'external_account' })], 'modern_treasury_sandbox_account_required'],
    [[account({ currency: null })], 'modern_treasury_invalid_response'],
    [[account({ id: 'unsafe\nvalue' })], 'modern_treasury_invalid_response'],
    [{ accounts: [] }, 'modern_treasury_invalid_response']
  ]) {
    const { connector } = fixture({ accounts });
    await assert.rejects(connector.listInternalAccounts(), { code });
    assert.equal(connector.status().state, 'verification_failed');
  }
});

test('upstream errors, redirects and malformed or excessive responses never expose raw details', async () => {
  const cases = [
    [() => response({ detail: SECRET }, 401), 'modern_treasury_authentication_failed'],
    [() => response({ detail: SECRET }, 403), 'modern_treasury_authentication_failed'],
    [() => response({ detail: SECRET }, 429), 'modern_treasury_rate_limited'],
    [() => response({ detail: SECRET }, 500), 'modern_treasury_upstream_failed'],
    [() => new Response('', { status: 302, headers: { location: 'https://untrusted.invalid' } }), 'modern_treasury_upstream_failed'],
    [() => new Response(SECRET), 'modern_treasury_invalid_response'],
    [() => new Response('x'.repeat(2 * 1024 * 1024 + 1)), 'modern_treasury_response_too_large'],
    [() => { throw new Error(`Authorization: ${SECRET}`); }, 'modern_treasury_unavailable']
  ];
  for (const [respond, code] of cases) {
    const { connector } = fixture({ respond });
    await assert.rejects(connector.verifyConnection(), error => {
      assert.equal(error.code, code);
      assert.ok(!error.message.includes(SECRET));
      assert.ok(!error.stack.includes(SECRET));
      return true;
    });
    assert.equal(connector.status().last_error, code);
  }
});

test('timeouts fail with a stable sanitized error', async () => {
  const keepAlive = setInterval(() => {}, 1000);
  try {
    const { connector } = fixture({ timeoutMs: 5, respond: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error(SECRET)), { once: true });
    }) });
    await assert.rejects(connector.verifyConnection(), { code: 'modern_treasury_timeout' });
  } finally { clearInterval(keepAlive); }
});

test('failed re-verification invalidates current state but preserves the last successful timestamp', async () => {
  let failRequest = false;
  const { connector } = fixture({ respond: url => {
    if (failRequest) return response({ detail: SECRET }, 401);
    return response(url.pathname.endsWith('/current') ? key() : { ping: 'pong' });
  } });
  await connector.verifyConnection();
  failRequest = true;
  await assert.rejects(connector.verifyConnection());
  assert.equal(connector.status().state, 'verification_failed');
  assert.equal(connector.status().last_verified_at, '2026-10-29T12:00:00.000Z');
});

async function httpFixture(t, options = {}) {
  const mock = fixture(options);
  const server = createTreasuryServer({ operatorToken: 'fixture-operator-token', modernTreasury: mock.connector });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (path, auth = true, init = {}) => fetch(`${base}${path}`, {
    ...init, headers: auth ? { authorization: 'Bearer fixture-operator-token', ...init.headers } : init.headers
  });
  return { ...mock, get };
}
const PREFIX = '/v1/integrations/modern-treasury';

test('HTTP integration routes require the treasury operator token and return no-store responses', async t => {
  const { get, calls } = await httpFixture(t);
  for (const route of ['/status', '/check', '/internal-accounts']) {
    const result = await get(`${PREFIX}${route}`, false);
    assert.equal(result.status, 401);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await result.json(), { error: 'operator_auth_required' });
  }
  assert.equal(calls.length, 0);
  const status = await get(`${PREFIX}/status`);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).state, 'not_verified');
  assert.equal(calls.length, 0);
  assert.equal((await get('/health', false)).status, 200);
  const snapshot = await (await get('/v1/estate/merchant-treasury', false)).text();
  assert.ok(!snapshot.includes(SECRET));
  assert.ok(!snapshot.includes('modern-treasury'));
});

test('HTTP check and account discovery exercise the sandbox connector', async t => {
  const { get } = await httpFixture(t, { accounts: [account()] });
  const check = await get(`${PREFIX}/check`);
  assert.equal(check.status, 200);
  assert.equal((await check.json()).state, 'verified');
  const result = await get(`${PREFIX}/internal-accounts?per_page=10&currency=USD`);
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).accounts, [{ id: 'sandbox-account-1', currency: 'USD', live_mode: false }]);
});

test('HTTP writes, unknown routes, duplicated and unsupported parameters cannot reach Modern Treasury', async t => {
  const { get, calls } = await httpFixture(t);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const result = await get(`${PREFIX}/payment_orders`, true, { method });
    assert.equal(result.status, 405);
    assert.equal(result.headers.get('allow'), 'GET');
  }
  assert.equal((await get(`${PREFIX}/payment_orders`)).status, 404);
  for (const path of ['/check?api_key=untrusted', '/status?url=https://untrusted.invalid',
    '/internal-accounts?per_page=10&per_page=100', '/internal-accounts?metadata=private',
    '/internal-accounts?per_page=', '/internal-accounts?after_cursor=']) {
    assert.equal((await get(`${PREFIX}${path}`)).status, 400);
  }
  assert.equal(calls.length, 0);
});

test('HTTP upstream errors expose only stable error codes', async t => {
  const { get } = await httpFixture(t, { respond: () => { throw new Error(SECRET); } });
  const result = await get(`${PREFIX}/check`);
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), {
    error: 'modern_treasury_unavailable', read_only: true, payment_execution_enabled: false
  });
});

test('missing operator token disables HTTP integration access even for an otherwise valid key', async t => {
  const { connector, calls } = fixture();
  const server = createTreasuryServer({ operatorToken: '', modernTreasury: connector });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const result = await fetch(`http://127.0.0.1:${server.address().port}${PREFIX}/check`, {
    headers: { authorization: 'Bearer fixture-operator-token' }
  });
  assert.equal(result.status, 401);
  assert.equal(calls.length, 0);
});

test('CLI helper verifies without accounts by default and offers an explicit single account page', async () => {
  const { connector, calls } = fixture({ accounts: [account()] });
  assert.equal((await checkModernTreasury({ connector })).connection.state, 'verified');
  assert.equal(calls.length, 2);
  const result = await checkModernTreasury({ connector, includeAccounts: true });
  assert.equal(result.account_page.accounts.length, 1);
  assert.ok(!JSON.stringify(result).includes(SECRET));
});

test('CLI missing credentials produces a nonzero sanitized machine-readable result', () => {
  const result = spawnSync(process.execPath, ['scripts/check-modern-treasury.mjs'], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', env: {}
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  const report = JSON.parse(result.stderr);
  assert.equal(report.verified, false);
  assert.equal(report.error, 'modern_treasury_credentials_missing');
  assert.equal(report.payment_execution_enabled, false);
});
