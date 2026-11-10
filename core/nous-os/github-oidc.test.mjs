import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createStagingOidcVerifier } from './github-oidc.mjs';
import { createNousServer } from './server.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createIdentityVerifier } from './identity.mjs';

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
    runner_environment: 'github-hosted',
    sub: 'repo:Shemsizedek/neo-system:pull_request',
    iat, nbf: iat, exp: iat + 300,
    ...changes,
  })).toString('base64url');
  const message = header + '.' + payload;
  return 'Bearer ' + message + '.' + sign('RSA-SHA256', Buffer.from(message), key).toString('base64url');
}
const makeVerifier = () => createStagingOidcVerifier({
  now: () => now,
  fetchImpl: async () => ({ ok: true, json: async () => ({ keys: [jwk] }) }),
});
test('verify trusted GitHub staging OIDC from exact PR workflow', async () => {
  const identity = await makeVerifier().verifyAuthorization(jwt());
  assert.equal(identity.subject, 'github-actions-nous-staging');
  assert.deepEqual([...identity.scopes], ['nous.task.plan']);
});
test('reject forged signatures and wrong repository workflow identity', async () => {
  const v = makeVerifier();
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(v.verifyAuthorization(jwt({}, other.privateKey)), /invalid_staging_signature/);
  for(const patch of [
    { repository: 'other/neo-system' }, { repository_id: '222' },
    { workflow_ref: 'other' }, { runner_environment: 'self-hosted' },
    { sub: 'repo:Shemsizedek/neo-system:ref:refs/heads/main' },
    { aud: 'bad-aud' }, { exp: Math.floor(now / 1000) - 1 },
  ]) await assert.rejects(v.verifyAuthorization(jwt(patch)), /staging_workflow_not_authorized|invalid_staging_claims/);
});
test('no unsigned fallback and staging route absent without explicit configuration', async () => {
  await assert.rejects(makeVerifier().verifyAuthorization('Bearer malformed'), /invalid_staging_token/);
  const runtime = createNousRuntime({ identityVerifier: createIdentityVerifier({}) });
  const server = createNousServer({ runtime });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/v1/staging/receipt';
    const response = await fetch(url, {method:'POST',headers:{authorization:jwt(),'content-type':'application/json'},body:'{}'});
    assert.equal(response.status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
