import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createStagingOidcVerifier } from './github-oidc.mjs';

const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...pair.publicKey.export({ format: 'jwk' }), alg: 'RS256', use: 'sig', kid: 'test-key' };
const now = 1780000000000;
function jwt(changes = {}, key = pair.privateKey) {
  const iat = Math.floor(now / 1000);
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: 'test-key' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: 'https://token.actions.githubusercontent.com', aud: 'neo-nous-staging-ci',
    repository: 'Shemsizedek/neo-system', repository_id: '1332533328',
    event_name: 'pull_request', workflow: 'NEO Nous OS hosted staging smoke',
    workflow_ref: 'Shemsizedek/neo-system/.github/workflows/nous-hosted-smoke.yml@refs/pull/1388/merge',
    ref: 'refs/pull/1388/merge', head_ref: 'feature/nous-os-core-runtime-p144-20261109',
    base_ref: 'main', runner_environment: 'github-hosted',
    sub: 'repo:Shemsizedek/neo-system:pull_request',
    iat, nbf: iat, exp: iat + 300, ...changes,
  })).toString('base64url');
  const message = header + '.' + payload;
  return 'Bearer ' + message + '.' + sign('RSA-SHA256', Buffer.from(message), key).toString('base64url');
}
function verifier() {
  return createStagingOidcVerifier({ now: () => now, fetchImpl: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });
}
test('signed OIDC token accepted only with full workflow provenance', async () => {
  const identity = await verifier().verifyAuthorization(jwt());
  assert.equal(identity.subject, 'github-actions-nous-staging');
  assert.deepEqual([...identity.scopes], ['nous.task.plan']);
});
test('forged or stale workflow token rejected', async () => {
  const v = verifier();
  const forged = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(v.verifyAuthorization(jwt({}, forged.privateKey)), /invalid_staging_signature/);
  for (const changes of [
    { repository: 'attacker/neo-system' }, { repository_id: '123' }, { event_name: 'push' },
    { workflow: 'Other' }, { head_ref: 'other' }, { ref: 'refs/heads/main' },
    { runner_environment: 'self-hosted' },
  ]) await assert.rejects(v.verifyAuthorization(jwt(changes)), /staging_workflow_not_authorized/);
  for (const changes of [{ aud: 'wrong' }, { exp: Math.floor(now / 1000) - 1 }, { exp: Math.floor(now / 1000) + 900 }])
    await assert.rejects(v.verifyAuthorization(jwt(changes)), /invalid_staging_claims/);
});
test('missing JWKS cannot degrade into unsigned access', async () => {
  const v = createStagingOidcVerifier({ now: () => now, fetchImpl: async () => { throw new Error('network'); } });
  await assert.rejects(v.verifyAuthorization(jwt()), /staging_oidc_keys_unavailable/);
  await assert.rejects(verifier().verifyAuthorization('Bearer garbage'), /invalid_staging_token/);
});
test('staging route accepts only bound OIDC claims and fixed safe planning parameters', async () => {
  const { createNousServer } = await import('./server.mjs');
  const { createNousRuntime } = await import('./runtime.mjs');
  const { createIdentityVerifier } = await import('./identity.mjs');
  const rows = new Map();
  const postgresReceiptStore = {
    stats: () => ({ backend: 'postgresql', durable: true }), ping: async () => true,
    getOrCreate: async value => {
      const key = value.subject + '/' + value.requestId;
      if (rows.has(key)) return { receipt: rows.get(key), inserted: false };
      rows.set(key, value);
      return { receipt: value, inserted: true };
    },
  };
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}), postgresReceiptStore });
  for (const enabled of [false, true]) {
    const server = createNousServer({ runtime, stagingOidcVerifier: enabled ? verifier() : null });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const url = 'http://127.0.0.1:' + server.address().port + '/v1/staging/receipt';
      const post = (body, authorization = jwt()) => fetch(url, { method: 'POST', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!enabled) { assert.equal((await post({ requestId: 'CI-P144-SMOKE-1' })).status, 404); continue; }
      assert.equal((await post({ requestId: 'CI-P144-SMOKE-1' }, 'Bearer fake')).status, 401);
      assert.equal((await post({ requestId: 'INVALID' })).status, 400);
      const response = await post({ requestId: 'CI-P144-SMOKE-1' });
      assert.equal(response.status, 200);
      const receipt = await response.json();
      assert.equal(receipt.capability, 'development.plan');
      assert.equal(receipt.execution, 'disabled');
      assert.equal(receipt.subject, 'github-actions-nous-staging');
      assert.deepEqual(await (await post({ requestId: 'CI-P144-SMOKE-1' })).json(), receipt);
      assert.equal((await post({ requestId: 'CI-P144-SMOKE-1', capability: 'finance.transfer' })).status, 400);
    } finally { await new Promise(resolve => server.close(resolve)); }
  }
});
