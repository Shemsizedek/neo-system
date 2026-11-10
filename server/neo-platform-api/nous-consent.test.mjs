import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { issueNeopassToken } from './neopass-google-auth.mjs';
import { createNousConsentHandler } from './nous-consent.mjs';

const secret = 'test-only-neopass-key';
let clock = 1780000000000;
const issued = (claims = {}, offset = 0) => issueNeopassToken({
  secret, issuer: 'neo-pass', subject: 'test:consent',
  now: () => clock + offset,
  claims: { token_use: 'session', aud: 'neopass-session', ...claims },
});
const credential = () => ({ subject: 'test:consent', status: 'active', nousAccessEnabled: false });
async function serve(config, action) {
  const registry = config.registry || {
    record: credential(),
    async getNEOpassCredential() { return this.record; },
    async setNEOpassNousAccess(subject, { enabled, nowEpochSeconds, sessionIssuedAt }) {
      if (this.record?.subject !== subject) throw Object.assign(new Error('nous_credential_not_found'), { code: 'nous_credential_not_found' });
      if (this.record.sessionRevokedAfter !== undefined && sessionIssuedAt <= this.record.sessionRevokedAfter)
        throw Object.assign(new Error('neopass_session_revoked'), { code: 'neopass_session_revoked' });
      this.record = { ...this.record, nousAccessEnabled: enabled,
        nousAccessExpiresAt: enabled ? new Date((nowEpochSeconds + 86400) * 1000).toISOString() : null,
        ...(!enabled ? { sessionRevokedAfter: nowEpochSeconds } : {}) };
      return this.record;
    },
  };
  const handler = createNousConsentHandler({ jwtSecret: secret, registry, now: () => clock });
  const server = createServer(async (req, res) => {
    if (await handler(req, res, new URL(req.url, 'http://localhost'))) return;
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action('http://127.0.0.1:' + server.address().port, registry); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const path = suffix => '/api/v1/auth/nous-consent/' + suffix;
async function hit(base, name, { token = issued(), method = 'POST', body, origin = 'https://holytemples.org' } = {}) {
  const res = await fetch(base + path(name), {
    method,
    headers: { authorization: 'Bearer ' + token, origin,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { code: res.status, value: await res.json() };
}

test('explicit self-consent grants only limited read-only access; revoke rejects old session', async () => {
  clock = 1780000000000;
  await serve({}, async base => {
    const session = issued();
    assert.equal((await hit(base, 'status', { method: 'GET', token: session })).value.nousAccessEnabled, false);
    assert.equal((await hit(base, 'grant', { token: session, body: { acknowledge: 'I-agree' } })).code, 400);
    const granted = await hit(base, 'grant', { token: session, body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } });
    assert.equal(granted.code, 200);
    assert.equal(granted.value.nousAccessEnabled, true);
    assert.ok(granted.value.expiresAt);
    const revoked = await hit(base, 'revoke', { token: session });
    assert.equal(revoked.code, 200);
    assert.equal(revoked.value.nousAccessEnabled, false);
    assert.equal((await hit(base, 'grant', { token: session, body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 403);
  });
});

test('rejects missing audience/purpose, stale token, cookie-only auth, wrong origin and body misuse', async () => {
  clock = 1780000000000;
  await serve({}, async base => {
    assert.equal((await hit(base, 'grant', { token: issued({ aud: 'other' }), body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 401);
    assert.equal((await hit(base, 'grant', { token: issued({ token_use: 'browser' }), body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 401);
    assert.equal((await hit(base, 'grant', { token: issued({}, -360000), body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 401);
    assert.equal((await hit(base, 'grant', { token: issued(), origin: 'https://attacker.test', body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 403);
    assert.equal((await hit(base, 'revoke', { body: {} })).code, 400);
    assert.equal((await hit(base, 'grant', { body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS', role: 'admin' } })).code, 400);
    const res = await fetch(base + path('status'), { method: 'GET', headers: { cookie: 'neo_pass_session=' + issued() } });
    assert.equal(res.status, 401);
  });
});

test('registry outage fails closed without issuing a grant', async () => {
  clock = 1780000000000;
  const registry = { async getNEOpassCredential() { throw new Error('offline'); }, async setNEOpassNousAccess() { throw new Error('offline'); } };
  await serve({ registry }, async base => {
    assert.equal((await hit(base, 'status', { method: 'GET' })).code, 503);
    assert.equal((await hit(base, 'grant', { body: { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' } })).code, 503);
  });
});
