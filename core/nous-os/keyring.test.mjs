import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createIdentityVerifier, identityFromEnv } from './identity.mjs';

const first = generateKeyPairSync('ed25519');
const second = generateKeyPairSync('ed25519');
const publicKeyPem = key => key.export({ format: 'pem', type: 'spki' });
const now = 1780000000000;
const epoch = Math.floor(now / 1000);

function token(key, kid, overrides = {}) {
  const h = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'EdDSA', ...(kid ? { kid } : {}) })).toString('base64url');
  const p = Buffer.from(JSON.stringify({
    sub: 'test-member', iss: 'neo-pass-nous-exchange', aud: 'neo-nous',
    iat: epoch, nbf: epoch, exp: epoch + 120, token_use: 'nous-read',
    scope: 'nous.agents.read',
    ...overrides,
  })).toString('base64url');
  const input = h + '.' + p;
  return 'Bearer ' + input + '.' + sign(null, Buffer.from(input), key).toString('base64url');
}
const keys = [
  { kid: 'neopass-v1', publicKeyPem: publicKeyPem(first.publicKey) },
  { kid: 'neopass-v2', publicKeyPem: publicKeyPem(second.publicKey) },
];
function make(overrides = {}) {
  return createIdentityVerifier({
    verificationKeys: keys, issuer: 'neo-pass-nous-exchange', audience: 'neo-nous',
    tokenUse: 'nous-read', maxLifetimeSeconds: 120, now: () => now, ...overrides,
  });
}
test('rotating keyring accepts two registered keys and rejects unknown, missing and revoked key IDs', () => {
  const v = make();
  assert.equal(v.configured, true);
  assert.equal(v.verifyAuthorization(token(first.privateKey, 'neopass-v1')).subject, 'test-member');
  assert.equal(v.verifyAuthorization(token(second.privateKey, 'neopass-v2')).subject, 'test-member');
  assert.throws(() => v.verifyAuthorization(token(first.privateKey)), /key_id_required/);
  assert.throws(() => v.verifyAuthorization(token(first.privateKey, 'wrong')), /unknown_key_id/);
  assert.throws(() => make({ revokedKeyIds: ['neopass-v1'] }).verifyAuthorization(token(first.privateKey, 'neopass-v1')), /key_revoked/);
  assert.equal(make({ revokedKeyIds: ['neopass-v1'] }).verifyAuthorization(token(second.privateKey, 'neopass-v2')).subject, 'test-member');
});
test('keyring fails closed on malformed input, duplicate key IDs or bad key material', () => {
  for (const verificationKeys of [
    [], [{ ...keys[0] }, { ...keys[0] }],
    [{ kid: 'bad', publicKeyPem: 'not a key' }],
    [{ ...keys[0], kid: '../../illegal' }],
  ]) {
    const verifier = make({ verificationKeys, publicKeyPem: publicKeyPem(first.publicKey) });
    assert.equal(verifier.configured, false);
    assert.throws(() => verifier.verifyAuthorization(token(first.privateKey, 'neopass-v1')), /identity_not_configured/);
  }
  const env = {
    NOUS_IDENTITY_ISSUER: 'neo-pass-nous-exchange',
    NOUS_IDENTITY_AUDIENCE: 'neo-nous',
    NOUS_IDENTITY_PUBLIC_KEY_PEM_BASE64: Buffer.from(publicKeyPem(first.publicKey)).toString('base64'),
    NOUS_IDENTITY_KEYRING_JSON_BASE64: Buffer.from('invalid json').toString('base64'),
  };
  assert.equal(identityFromEnv(env).configured, false);
});
