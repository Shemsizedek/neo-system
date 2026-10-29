import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHandler } from '../neo-counter-backend/server.mjs';
import { createModernTreasuryHttpHandler } from './modern-treasury-http.mjs';
import { createCounterTreasuryStagingServer } from '../../deploy/modern-treasury-render/counter-staging.mjs';

const PREFIX = '/v1/integrations/modern-treasury';
async function fixture(t, operatorToken = 'treasury-operator') {
  const calls = [];
  const counterHandler = createHandler({}, { auth: {
    sessionPrincipal: req => req.headers.authorization === 'Bearer merchant-session' ? {
      merchantId: 'fixture-merchant', terminalId: 'fixture-terminal', staffId: 'fixture-staff', permissions: ['register']
    } : null
  } });
  const treasuryHandler = createModernTreasuryHttpHandler({ operatorToken, connector: {
    status: () => { calls.push('status'); return { state: 'not_configured', read_only: true }; },
    verifyConnection: async () => { calls.push('check'); return { state: 'verified', read_only: true }; },
    listInternalAccounts: async () => { calls.push('accounts'); return { accounts: [], read_only: true }; }
  } });
  const server = createCounterTreasuryStagingServer({ counterHandler, treasuryHandler, revision: 'test-source-revision' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { calls, request: (path, token, method = 'GET') => fetch(`${base}${path}`, {
    method, headers: token ? { authorization: `Bearer ${token}` } : {}
  }) };
}

test('combined staging keeps Counter health and merchant sessions working', async t => {
  const { request, calls } = await fixture(t);
  const health = await request('/health');
  assert.deepEqual(await health.json(), { ok: true, service: 'neo-counter-backend' });
  const session = await request('/session/me', 'merchant-session');
  assert.equal(session.status, 200);
  assert.equal((await session.json()).merchantId, 'fixture-merchant');
  assert.deepEqual(calls, []);
});

test('merchant sessions and treasury operators cannot cross the two authorization boundaries', async t => {
  const { request, calls } = await fixture(t);
  assert.equal((await request(`${PREFIX}/check`, 'merchant-session')).status, 401);
  assert.equal((await request(`${PREFIX}/status`)).status, 401);
  assert.deepEqual(calls, []);
  assert.equal((await request(`${PREFIX}/check`, 'treasury-operator')).status, 200);
  assert.deepEqual(calls, ['check']);
  assert.equal((await request('/session/me', 'treasury-operator')).status, 401);
  assert.equal((await request(`${PREFIX}/check`, 'treasury-operator', 'POST')).status, 405);
  assert.deepEqual(calls, ['check']);
});

test('combined staging remains closed when the dedicated operator token is absent', async t => {
  const { request, calls } = await fixture(t, '');
  for (const suffix of ['/status', '/check', '/internal-accounts']) {
    assert.equal((await request(`${PREFIX}${suffix}`, 'merchant-session')).status, 401);
  }
  assert.equal((await request('/session/me', 'merchant-session')).status, 200);
  assert.deepEqual(calls, []);
});

test('combined staging exposes only a nonsecret Modern Treasury health record', async t => {
  const { request, calls } = await fixture(t);
  const result = await request('/health/modern-treasury');
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), {
    ok: true, service: 'neo-counter-modern-treasury-staging', environment: 'sandbox',
    read_only: true, payment_execution_enabled: false, revision: 'test-source-revision'
  });
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(calls, []);
});
