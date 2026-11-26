import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createIdentityVerifier } from './identity.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createNousServer } from './server.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
const now = 1780000000000;
const config = { publicKeyPem, issuer: 'test-neopass', audience: 'neo-nous', now: () => now };
const verifier = createIdentityVerifier(config);
function token({ alg = 'EdDSA', exp = Math.floor(now / 1000) + 120, scope = 'nous.task.plan nous.agents.read', ...rest } = {}, key = privateKey) {
  const a = Buffer.from(JSON.stringify({ typ: 'JWT', alg })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ iss: 'test-neopass', aud: 'neo-nous', sub: 'tester', exp, scope, ...rest })).toString('base64url');
  return a + '.' + b + '.' + sign(null, Buffer.from(a + '.' + b), key).toString('base64url');
}
const bearer = (overrides, key) => 'Bearer ' + token(overrides, key);

test('identity fails closed and verifies EdDSA JWT without accepting forged claims', () => {
  assert.equal(createIdentityVerifier({}).configured, false);
  assert.throws(() => createIdentityVerifier({}).verifyAuthorization(bearer()), /identity_not_configured/);
  assert.equal(verifier.verifyAuthorization(bearer()).subject, 'tester');
  assert.throws(() => verifier.verifyAuthorization(undefined), /bearer_required/);
  assert.throws(() => verifier.verifyAuthorization(bearer({ exp: Math.floor(now / 1000) - 1 })), /invalid_claims/);
  assert.throws(() => verifier.verifyAuthorization(bearer({ aud: 'other' })), /invalid_claims/);
  assert.throws(() => verifier.verifyAuthorization(bearer({ iss: 'other' })), /invalid_claims/);
  assert.throws(() => verifier.verifyAuthorization(bearer({ nbf: Math.floor(now / 1000) + 500 })), /invalid_claims/);
  const otherKey = generateKeyPairSync('ed25519');
  assert.throws(() => verifier.verifyAuthorization(bearer({}, otherKey.privateKey)), /invalid_signature/);
  assert.throws(() => verifier.verifyAuthorization(bearer({ alg: 'none' })), /invalid_algorithm/);
});

test('agent routing is scoped, plan-only, and audit excludes prompts', () => {
  const audit = [];
  const runtime = createNousRuntime({ identityVerifier: verifier, audit: event => audit.push(event), now: () => '2026-11-09T12:00:00Z' });
  assert.equal(runtime.listAgents(bearer()).agents.find(a => a.id === 'NIA-008').status, 'routing_only');
  const planned = runtime.plan(bearer(), { requestId: 'T-1', agentId: 'NIA-008', capability: 'development.plan', parameters: { secret: 'never-log-this' } });
  assert.equal(planned.execution, 'disabled');
  assert.equal(planned.status, 'planned');
  assert.equal(JSON.stringify(audit).includes('never-log-this'), false);
  assert.equal(runtime.plan(bearer(), { requestId: 'T-2', agentId: 'NIA-006', capability: 'finance.transfer' }).status, 'approval_required');
  assert.throws(() => runtime.plan(bearer({ scope: 'nous.agents.read' }), { requestId: 'T-3', agentId: 'NIA-008', capability: 'development.plan' }), /scope_denied/);
  assert.throws(() => runtime.listAgents(bearer({ scope: 'nous.task.plan' })), /scope_denied/);
  assert.throws(() => runtime.plan(bearer(), { requestId: 'T-4', agentId: 'MISSING', capability: 'project.plan' }), /unknown_agent/);
});

test('HTTP liveness is separate from readiness and protected routes', async () => {
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}) });
  const server = createNousServer({ runtime });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const health = await fetch(base + '/health');
    assert.equal(health.status, 200);
    assert.equal((await health.json()).mode, 'plan-only');
    assert.equal((await fetch(base + '/ready')).status, 503);
    assert.equal((await fetch(base + '/v1/agents')).status, 503);
    assert.equal((await fetch(base + '/v1/tasks/plan', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestId: 'T-1' }) })).status, 503);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('HTTP authenticated planning and bounded task payloads', async () => {
  const runtime = createNousRuntime({ identityVerifier: verifier });
  const server = createNousServer({ runtime });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const header = { authorization: bearer(), 'content-type': 'application/json' };
    assert.equal((await fetch(base + '/ready')).status, 200);
    assert.equal((await fetch(base + '/v1/agents', { headers: header })).status, 200);
    const result = await fetch(base + '/v1/tasks/plan', { method: 'POST', headers: header, body: JSON.stringify({ requestId: 'T-HTTP', agentId: 'NIA-001', capability: 'project.plan' }) });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).execution, 'disabled');
    assert.equal((await fetch(base + '/v1/tasks/plan', { method: 'POST', headers: header, body: '{broken' })).status, 400);
    assert.equal((await fetch(base + '/v1/tasks/plan', { method: 'POST', headers: header, body: JSON.stringify({ requestId: 'T-5', agentId: 'NIA-001', capability: 'project.plan', data: 'x'.repeat(34000) }) })).status, 413);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
