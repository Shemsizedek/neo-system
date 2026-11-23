import test from 'node:test';
import assert from 'node:assert/strict';
import { runStagingConnectionProbe } from '../../deploy/modern-treasury-render/connection-probe.mjs';
import { createModernTreasuryConnector } from './modern-treasury.mjs';

const response = (value, status = 200) => new Response(JSON.stringify(value), { status });
const verified = { state: 'verified', environment: 'sandbox', read_only: true, payment_execution_enabled: false };
const page = { environment: 'sandbox', read_only: true, payment_execution_enabled: false, accounts: [{ id: 'private-account', live_mode: false }], pagination: { next_after_cursor: null } };
function fixture({ check = response(verified), accounts = response(page), unauthorizedStatus = 401 } = {}) {
  const calls = [], reports = [];
  const options = {
    baseUrl: 'http://127.0.0.1:10000', operatorToken: 'private-operator-token', emit: value => reports.push(value),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (!init.headers) return response({}, unauthorizedStatus);
      return url.includes('/internal-accounts') ? accounts : check;
    }
  };
  return { options, calls, reports };
}

test('startup probe checks the real auth boundary and reports sandbox account counts without identifiers', async () => {
  const { options, calls, reports } = fixture();
  const report = await runStagingConnectionProbe(options);
  assert.equal(report.verified, true);
  assert.equal(report.unauthenticated_http_status, 401);
  assert.equal(report.authenticated_check_http_status, 200);
  assert.equal(report.internal_accounts_http_status, 200);
  assert.equal(report.account_count_on_page, 1);
  assert.equal(calls.length, 3);
  assert.equal(calls[1].init.headers.authorization, 'Bearer private-operator-token');
  assert.ok(!JSON.stringify(reports).includes('private'));
});

test('startup probe requires loopback origin and a configured operator before any request', async () => {
  for (const changes of [{ baseUrl: 'https://untrusted.invalid' }, { operatorToken: '' }]) {
    const { options, calls } = fixture();
    assert.equal((await runStagingConnectionProbe({ ...options, ...changes })).verified, false);
    assert.equal(calls.length, 0);
  }
});

test('startup probe rejects an open auth boundary and misleading successful responses', async () => {
  for (const changes of [
    { unauthorizedStatus: 200 },
    { check: response({ ...verified, environment: 'production' }) },
    { check: response({ ...verified, read_only: false }) },
    { check: response({ ...verified, payment_execution_enabled: true }) },
    { accounts: response({ ...page, payment_execution_enabled: true }) },
    { accounts: response({ ...page, accounts: [{ live_mode: true }] }) }
  ]) {
    const { options } = fixture(changes);
    assert.equal((await runStagingConnectionProbe(options)).verified, false);
  }
});

test('startup probe logs stable provider errors and policy summaries while hiding raw failures', async () => {
  const { options, calls } = fixture({ check: response({ error: 'modern_treasury_read_only_key_required', message: 'private-provider-detail' }, 409) });
  const report = await runStagingConnectionProbe({ ...options, describeKeyPolicy: async () => ({ sandbox: true, roles: [] }) });
  assert.equal(report.error, 'modern_treasury_read_only_key_required');
  assert.deepEqual(report.key_policy, { sandbox: true, roles: [] });
  assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(report).includes('private'));
  const failed = await runStagingConnectionProbe({ ...options, fetchImpl: async () => { throw new Error('private-failure'); } });
  assert.equal(failed.error, 'treasury_probe_unavailable');
  assert.ok(!JSON.stringify(failed).includes('private'));
});

test('policy diagnostics omit key values, IDs, names, raw role references and unknown permission strings', async () => {
  const secret = 'secret-that-must-not-be-logged';
  const connector = createModernTreasuryConnector({
    env: { MODERN_TREASURY_ORGANIZATION_ID: 'private-org', MODERN_TREASURY_API_KEY: secret },
    fetchImpl: async () => response({
      object: 'api_key', live_mode: false, organization_id: 'private-org', id: 'private-id', name: secret, secret,
      decommissioned: false, roles: ['accounts:read:private-account', 'opaque-private-role', { id: 'private-role', permissions: [{ resource: 'internal_accounts', actions: ['view', secret] }] }],
      permissions: [{ resource: 'internal_accounts', actions: ['view'] }]
    })
  });
  const policy = await connector.describeKeyPolicy();
  assert.equal(policy.organization_matches, true);
  assert.deepEqual(policy.roles[0], { type: 'string', scope: 'accounts:read' });
  assert.equal(policy.roles[1].scope, null);
  assert.deepEqual(policy.permissions[0].actions, ['view']);
  assert.equal(policy.roles[2].permissions[0].unrecognized_actions, 1);
  assert.ok(!JSON.stringify(policy).includes(secret));
  assert.ok(!JSON.stringify(policy).includes('private'));
});
