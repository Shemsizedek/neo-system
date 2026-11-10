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
    iss: 'https://token.actions.githubusercontent.com',
    aud: 'neo-nous-staging-ci',
    repository: 'Shemsizedek/neo-system',
    repository_id: '1332533328',
    event_name: 'pull_request',
    workflow: 'NEO Nous OS hosted staging smoke',
    workflow_ref: 'Shemsizedek/neo-system/.github/workflows/nous-hosted-smoke.yml@refs/pull/1388/merge',
    ref: 'refs/pull/1388/merge',
    head_ref: 'feature/nous-os-core-runtime-p144-20261109',
    base_ref: 'main',
    sub: 'repo:Shemsizedek/neo-system:pull_request',
    iat, nbf: iat, exp: iat + 300,
    ...changes,
  })).toString('base64url');
  const message = header + '.' + payload;
  return 'Bearer ' + message + '.' + sign('RSA-SHA256', Buffer.from(message), key).toString('base64url');
}
function verifier() {
  return createStagingOidcVerifier({
    now: () => now,
    fetchImpl: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }),
  });
}

test('GitHub-hosted staging OIDC token is verified against RSA signing key and full workflow provenance', async () => {
  const identity = await verifier().verifyAuthorization(jwt());
  assert.equal(identity.subject, 'github-actions-nous-staging');
  assert.deepEqual([...identity.scopes], ['nous.task.plan']);
  assert.equal(identity.issuer, 'https://token.actions.githubusercontent.com');
});

test('staging OIDC denies forged key, wrong repository, PR, workflow, event, audience, and expired credentials', async () => {
  const v = verifier();
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(v.verifyAuthorization(jwt({}, other.privateKey)), /invalid_staging_signature/);
  for (const claims of [
    { repository: 'attacker/neo-system' },
    { repository_id: 'other-id' },
    { event_name: 'push' },
    { workflow: 'Other Workflow' },
    { workflow_ref: 'Shemsizedek/neo-system/.github/workflows/other.yml@refs/pull/1388/merge' },
    { ref: 'refs/pull/1999/merge' },
    { head_ref: 'untrusted-branch' },
    { sub: 'repo:Shemsizedek/neo-system:ref:refs/heads/main' },
  ]) await assert.rejects(v.verifyAuthorization(jwt(claims)), /staging_workflow_not_authorized/);
  for (const claims of [
    { aud: 'something-else' }, { exp: Math.floor(now / 1000) - 1 },
    { exp: Math.floor(now / 1000) + 1200 },
  ]) await assert.rejects(v.verifyAuthorization(jwt(claims)), /invalid_staging_claims/);
});

test('JWKS fetch errors reject with 503 and no unsigned fallback', async () => {
  const v = createStagingOidcVerifier({ now: () => now, fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(v.verifyAuthorization(jwt()), /staging_oidc_keys_unavailable/);
  await assert.rejects(verifier().verifyAuthorization('Bearer garbage'), /invalid_staging_token/);
});
