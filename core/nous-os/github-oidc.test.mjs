import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createStagingOidcVerifier } from './github-oidc.mjs';
import { createIdentityVerifier } from './identity.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createNousServer } from './server.mjs';

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-rsa', use: 'sig', alg: 'RS256' };
const now = 1780000000000, clock = Math.floor(now / 1000);
const claims = {
  iss: 'https://token.actions.githubusercontent.com', aud: 'neo-nous-staging-ci',
  sub: 'repo:Shemsizedek/neo-system:pull_request',
  repository: 'Shemsizedek/neo-system', repository_id: '1332533328',
  ref: 'refs/pull/1388/merge', event_name: 'pull_request',
  head_ref: 'feature/nous-os-core-runtime-p144-20261109', base_ref: 'main',
  workflow: 'NEO Nous OS hosted staging smoke',
  workflow_ref: 'Shemsizedek/neo-system/.github/workflows/nous-hosted-smoke.yml@refs/pull/1388/merge',
  runner_environment: 'github-hosted', iat: clock, nbf: clock, exp: clock + 300,
};
function jwt(payload = claims, key = privateKey) {
  const a = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: 'test-rsa' })).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return a + '.' + b + '.' + sign('RSA-SHA256', Buffer.from(a + '.' + b), key).toString('base64url');
}
const verifier = createStagingOidcVerifier({ now: () => now, fetchImpl: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }) });

test('only signature-verified OIDC identity from approved PR workflow is trusted', async () => {
  const identity = await verifier.verifyAuthorization('Bearer ' + jwt());
  assert.equal(identity.subject, 'github-actions-nous-staging');
  assert.deepEqual([...identity.scopes], ['nous.task.plan']);
  await assert.rejects(verifier.verifyAuthorization('Bearer ' + jwt({ ...claims, head_ref: 'attacker' })), /staging_workflow_not_authorized/);
  await assert.rejects(verifier.verifyAuthorization('Bearer ' + jwt({ ...claims, aud: 'wrong' })), /invalid_staging_claims/);
  await assert.rejects(verifier.verifyAuthorization('Bearer ' + jwt({ ...claims, repository_id: 'other' })), /staging_workflow_not_authorized/);
  await assert.rejects(verifier.verifyAuthorization('Bearer ' + jwt({ ...claims, exp: clock - 1 })), /invalid_staging_claims/);
  await assert.rejects(verifier.verifyAuthorization('Bearer ' + jwt(claims, generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey)), /invalid_staging_signature/);
  await assert.rejects(verifier.verifyAuthorization(undefined), /staging_bearer_required/);
});

test('staging receipt route remains off by default and is strictly bounded when enabled', async () => {
  const receipts = new Map();
  const store = {
    async getOrCreate(receipt) {
      const key = JSON.stringify([receipt.subject, receipt.requestId]);
      if (receipts.has(key)) return { receipt: receipts.get(key), inserted: false };
      receipts.set(key, receipt);
      return { receipt, inserted: true };
    },
    async ping() { return true; },
    stats() { return { durable: true, backend: 'postgresql' }; },
  };
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}), postgresReceiptStore: store });
  const server = createNousServer({ runtime, stagingOidcVerifier: verifier });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const endpoint = 'http://127.0.0.1:' + server.address().port + '/v1/staging/receipt';
    assert.equal((await fetch(endpoint)).status, 405);
    assert.equal((await fetch(endpoint, { method: 'POST' })).status, 401);
    const request = body => fetch(endpoint, {
      method: 'POST', headers: { authorization: 'Bearer ' + jwt(), 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal((await request({ requestId: 'BAD' })).status, 400);
    const a = await request({ requestId: 'CI-P144-REPLAY-1' });
    assert.equal(a.status, 200);
    const first = await a.json();
    assert.equal(first.execution, 'disabled');
    const b = await request({ requestId: 'CI-P144-REPLAY-1' });
    assert.deepEqual(await b.json(), first);
    assert.equal(receipts.size, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
  const off = createNousServer({ runtime });
  await new Promise(resolve => off.listen(0, '127.0.0.1', resolve));
  try {
    const url = 'http://127.0.0.1:' + off.address().port + '/v1/staging/receipt';
    assert.equal((await fetch(url, { method: 'POST' })).status, 404);
  } finally { await new Promise(resolve => off.close(resolve)); }
});
