import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createModernTreasuryStagingServer } from './modern-treasury-staging.mjs';

const PREFIX = '/v1/integrations/modern-treasury';
async function fixture(t, { operatorToken = 'test-operator', connector } = {}) {
  const calls = [];
  connector ||= {
    status: () => { calls.push('status'); return { state: 'not_configured', read_only: true }; },
    verifyConnection: async () => { calls.push('check'); return { state: 'verified', read_only: true }; },
    listInternalAccounts: async options => { calls.push(options); return { accounts: [], read_only: true }; }
  };
  const server = createModernTreasuryStagingServer({ operatorToken, connector, revision: 'test-revision' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { calls, request: (path, options = {}) => fetch(`${base}${path}`, options) };
}

test('staging health exposes no account or credential configuration and makes no provider call', async t => {
  const { calls, request } = await fixture(t);
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await result.json(), {
    ok: true, service: 'neo-modern-treasury-staging', environment: 'sandbox',
    read_only: true, payment_execution_enabled: false, revision: 'test-revision'
  });
  assert.deepEqual(calls, []);
});

test('staging host denies unauthenticated reads and defaults to locked when no operator token is provisioned', async t => {
  for (const token of ['test-operator', '']) {
    const { calls, request } = await fixture(t, { operatorToken: token });
    for (const path of ['/status', '/check', '/internal-accounts']) {
      const result = await request(`${PREFIX}${path}`);
      assert.equal(result.status, 401);
    }
    const wrong = await request(`${PREFIX}/check`, { headers: { authorization: 'Bearer wrong-token' } });
    assert.equal(wrong.status, 401);
    assert.deepEqual(calls, []);
  }
});

test('staging serves the shared authorized read contract and blocks every merchant write and snapshot', async t => {
  const { calls, request } = await fixture(t);
  const headers = { authorization: 'Bearer test-operator' };
  for (const path of ['/status', '/check', '/internal-accounts?per_page=10&currency=USD']) {
    assert.equal((await request(`${PREFIX}${path}`, { headers })).status, 200);
  }
  assert.deepEqual(calls, ['status', 'check', { perPage: 10, afterCursor: undefined, currency: 'USD' }]);
  const rejected = await request(`${PREFIX}/check`, { method: 'POST', headers });
  assert.equal(rejected.status, 405);
  for (const path of ['/v1/estate/merchant-treasury', '/v1/credits', '/v1/payouts', '/v1/refunds', '/v1/reserves']) {
    for (const method of ['GET', 'POST']) assert.equal((await request(path, { method, headers })).status, 404);
  }
  assert.equal(calls.length, 3);
});

test('staging never exposes unexpected connector exceptions', async t => {
  const { request } = await fixture(t, { connector: {
    verifyConnection: async () => { throw new Error('sensitive-upstream-detail'); }
  } });
  const result = await request(`${PREFIX}/check`, { headers: { authorization: 'Bearer test-operator' } });
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), {
    error: 'modern_treasury_request_failed', read_only: true, payment_execution_enabled: false
  });
});
