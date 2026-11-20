import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, createHmac } from 'node:crypto';
import { issueNeopassToken } from './neopass-google-auth.mjs';
import { createNousTokenExchange } from './nous-token-exchange.mjs';
import { createNousMembershipGuard } from './nous-membership-guard.mjs';
import { createIdentityVerifier } from '../../core/nous-os/identity.mjs';

const now = 1780000000000;
const secret = 'integration-test-secret-never-production';
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' });
const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' });
const verifier = createIdentityVerifier({
  publicKeyPem, issuer: 'neo-pass-nous-exchange', audience: 'neo-nous',
  tokenUse: 'nous-read', maxLifetimeSeconds: 120, now: () => now,
});
const valid = (claims = {}) => issueNeopassToken({
  subject: 'user:123',
  secret,
  issuer: 'neo-pass',
  now: () => now,
  ttlSeconds: 3600,
  claims: { token_use: 'session', aud: 'neopass-session', ...claims },
});
function tokenWithoutExpiry() {
  const h = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
  const b = Buffer.from(JSON.stringify({ sub: 'user:123', iss: 'neo-pass', iat: Math.floor(now / 1000) })).toString('base64url');
  const sig = createHmac('sha256', secret).update(h + '.' + b).digest('base64url');
  return h + '.' + b + '.' + sig;
}
async function withServer({ status = 'active', sessionError = false, registryStatus = 'active', consent = true, revokedAfter = null, registryError = false } = {}, action) {
  const exchange = createNousTokenExchange({
    jwtSecret: secret, jwtIssuer: 'neo-pass', privateKeyPem,
    authService: { session: async sub => {
      if (sessionError) throw new Error('no registry');
      return { subject: sub, neopassStatus: status };
    } },
    now: () => now,
    signingKeyId: 'neopass-test-key-2026',
    membershipGuard: createNousMembershipGuard({
      now: () => now,
      getCredential: async sub => {
        if (registryError) throw new Error('registry unavailable');
        return { subject: sub, status: registryStatus, nousAccessEnabled: consent, sessionRevokedAfter: revokedAfter };
      },
    }),
  });
  const server = createServer(async (req, res) => {
    try {
      if (await exchange(req, res, new URL(req.url, 'http://localhost'))) return;
      res.writeHead(404); res.end();
    } catch {
      res.writeHead(500); res.end();
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('exchange is fail-closed without a valid signing configuration', () => {
  assert.throws(() => createNousTokenExchange({}), /nous_token_exchange_configuration_required/);
  assert.throws(() => createNousTokenExchange({
    jwtSecret: secret, jwtIssuer: 'neo-pass', authService: { session: async () => ({}) },
    privateKeyPem: 'invalid PEM',
  }));
});

test('exchanges authenticated active NEOpass session for scoped, short-lived Nous EdDSA token', async () => {
  await withServer({}, async base => {
    const res = await fetch(base + '/api/v1/auth/nous-token', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + valid(), origin: 'https://holytemples.org' },
    });
    assert.equal(res.status, 200);
    const response = await res.json();
    assert.equal(response.expiresIn, 120);
    assert.equal(response.scope.includes('nous.task.plan'), false);
    const identity = verifier.verifyAuthorization('Bearer ' + response.token);
    assert.equal(identity.subject, 'user:123');
    assert.ok(identity.scopes.has('nous.adapters.read'));
    assert.ok(!identity.scopes.has('nous.task.plan'));
    const parts = response.token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    assert.equal(payload.token_use, 'nous-read');
    assert.equal(payload.exp - payload.iat, 120);
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    assert.equal(header.kid, 'neopass-test-key-2026');
    assert.equal((await fetch(base + '/unknown')).status, 404);
  });
});

test('exchange refuses cookie, wrong origin, browser token, expired/missing exp, and GET', async () => {
  await withServer({}, async base => {
    const url = base + '/api/v1/auth/nous-token';
    const post = (authorization, extra = {}) => fetch(url, { method: 'POST', headers: { authorization, ...extra } });
    assert.equal((await fetch(url, { method: 'GET', headers: { authorization: 'Bearer ' + valid() } })).status, 405);
    assert.equal((await fetch(url, { method: 'POST', headers: { cookie: 'neo_pass_session=' + valid() } })).status, 401);
    assert.equal((await post('Bearer ' + valid(), { origin: 'https://evil.example' })).status, 403);
    assert.equal((await post('Bearer ' + valid({ token_use: 'browser' }))).status, 401);
    assert.equal((await post('Bearer ' + valid({ aud: 'other' }))).status, 401);
    assert.equal((await post('Bearer ' + valid({ token_use: undefined }))).status, 401);
    assert.equal((await post('Bearer ' + tokenWithoutExpiry())).status, 401);
    assert.equal((await post('Bearer ' + issueNeopassToken({ subject: 'user:123', secret, issuer: 'neo-pass', now: () => now, ttlSeconds: -1 }))).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { authorization: 'Bearer ' + valid(), 'content-type': 'application/json' }, body: '{}' })).status, 400);
  });
});

test('exchange checks active membership and fails closed on directory errors', async () => {
  await withServer({ status: 'pending' }, async base => {
    assert.equal((await fetch(base + '/api/v1/auth/nous-token', { method: 'POST', headers: { authorization: 'Bearer ' + valid() } })).status, 403);
  });
  await withServer({ sessionError: true }, async base => {
    assert.equal((await fetch(base + '/api/v1/auth/nous-token', { method: 'POST', headers: { authorization: 'Bearer ' + valid() } })).status, 503);
  });
});

test('exchange requires explicit registry consent and enforces account revocation', async () => {
  for (const cfg of [
    { registryStatus: 'pending' },
    { registryStatus: 'disabled' },
    { consent: false },
    { revokedAfter: Math.floor(now / 1000) },
  ]) {
    await withServer(cfg, async base => {
      const response = await fetch(base + '/api/v1/auth/nous-token', {
        method: 'POST', headers: { authorization: 'Bearer ' + valid() },
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).error, 'nous_registry_authorization_required');
    });
  }
  await withServer({ registryError: true }, async base => {
    const response = await fetch(base + '/api/v1/auth/nous-token', {
      method: 'POST', headers: { authorization: 'Bearer ' + valid() },
    });
    assert.equal(response.status, 503);
  });
});
