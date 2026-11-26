import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { issueNeopassToken, verifyNeopassToken } from './neopass-google-auth.mjs';
import { createNousConsentIntentHandler } from './nous-consent-intent.mjs';
import { createNousConsentHandler } from './nous-consent.mjs';
import { createNousConsentPageHandler } from './nous-consent-page.mjs';

const now = 1780000000000;
const epoch = Math.floor(now / 1000);
const secret = 'test-only-consent-intent-secret';
const record = () => ({ subject: 'google:member', status: 'active', nousAccessEnabled: false });
const session = (claims = {}, age = 0) => issueNeopassToken({
  subject: 'google:member', secret, issuer: 'neo-pass', now: () => now - age * 1000,
  claims: { token_use: 'session', aud: 'neopass-session', ...claims },
});
async function withServer({ enable = true, registry = { getNEOpassCredential: async () => record() } } = {}, action) {
  const handler = createNousConsentIntentHandler({ jwtSecret: secret, registry, now: () => now });
  const page = createNousConsentPageHandler({ enabled: enable });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'https://egov.holytemples.org');
    if (page(req, res, url)) return;
    if (enable && await handler(req, res, url)) return;
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await action('http://127.0.0.1:' + server.address().port); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
async function intent(base, token = session(), headers = {}) {
  return fetch(base + '/api/v1/auth/nous-consent/intent', {
    headers: { cookie: 'neo_pass_session=' + token, 'sec-fetch-site': 'same-origin', ...headers },
  });
}

test('same-origin consent intent is purpose-bound, short lived, and only issued for recent valid login', async () => {
  await withServer({}, async base => {
    const res = await intent(base);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.expiresIn, 120);
    const claims = verifyNeopassToken(body.token, { secret, issuer: 'neo-pass', now: () => now });
    assert.equal(claims.token_use, 'nous-consent-intent');
    assert.equal(claims.aud, 'neopass-consent');
    assert.equal(claims.scope, 'nous:consent:self');
    assert.equal(claims.auth_time, epoch);
    assert.equal(claims.exp - claims.iat, 120);
  });
});

test('cookie, cross-site, legacy token and inactive account cannot mint consent intent', async () => {
  await withServer({}, async base => {
    assert.equal((await fetch(base + '/api/v1/auth/nous-consent/intent')).status, 401);
    assert.equal((await intent(base, session({}, 360))).status, 401);
    assert.equal((await intent(base, session({ token_use: 'browser' }))).status, 401);
    assert.equal((await intent(base, session({ aud: 'wrong' }))).status, 401);
    assert.equal((await intent(base, session(), { origin: 'https://not-allowed.example' })).status, 403);
    assert.equal((await intent(base, session(), { 'sec-fetch-site': 'cross-site' })).status, 403);
  });
  await withServer({ registry: { getNEOpassCredential: async () => ({ ...record(), status: 'suspended' }) } }, async base => {
    assert.equal((await intent(base)).status, 403);
  });
  await withServer({ registry: { getNEOpassCredential: async () => { throw new Error('offline'); } } }, async base => {
    assert.equal((await intent(base)).status, 503);
  });
});

test('HTML/CSS/JS consent review assets are default-off, served under strict same-origin CSP', async () => {
  await withServer({ enable: false }, async base => {
    assert.equal((await fetch(base + '/neopass/nous-access')).status, 404);
    assert.equal((await fetch(base + '/neopass/nous-access.js')).status, 404);
    assert.equal((await fetch(base + '/api/v1/auth/nous-consent/intent')).status, 404);
  });
  await withServer({}, async base => {
    const page = await fetch(base + '/neopass/nous-access');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(page.headers.get('content-security-policy'), /style-src 'self'/);
    assert.equal(page.headers.get('x-frame-options'), 'DENY');
    const html = await page.text();
    assert.match(html, /I understand this is optional/);
    assert.match(html, /name="viewport"/);
    assert.doesNotMatch(html, /type="password"/);
    const script = await fetch(base + '/neopass/nous-access.js');
    assert.equal(script.status, 200);
    assert.match(await script.text(), /credentials: 'same-origin'/);
    assert.equal((await fetch(base + '/neopass/nous-access.css')).status, 200);
  });
});

test('short consent intent can grant and revoke without modifying roles; older session cannot re-grant', async () => {
  let dbRecord = record();
  const registry = {
    getNEOpassCredential: async () => dbRecord,
    async setNEOpassNousAccess(sub, { enabled, sessionIssuedAt, nowEpochSeconds }) {
      if (dbRecord.sessionRevokedAfter !== undefined && sessionIssuedAt <= dbRecord.sessionRevokedAfter) {
        throw Object.assign(new Error('neopass_session_revoked'), { code: 'neopass_session_revoked' });
      }
      dbRecord = { ...dbRecord, nousAccessEnabled: enabled,
        nousAccessExpiresAt: enabled ? new Date((nowEpochSeconds + 86400) * 1000).toISOString() : null,
        ...(!enabled ? { sessionRevokedAfter: nowEpochSeconds } : {}),
      };
      return dbRecord;
    },
  };
  const intentHandler = createNousConsentIntentHandler({ jwtSecret: secret, registry, now: () => now });
  const consentHandler = createNousConsentHandler({ jwtSecret: secret, registry, now: () => now });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'https://egov.holytemples.org');
    if (await intentHandler(req, res, url)) return;
    if (await consentHandler(req, res, url)) return;
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const temporary = (await (await intent(base)).json()).token;
    const post = (suffix, body) => fetch(base + '/api/v1/auth/nous-consent/' + suffix, {
      method: 'POST', headers: { authorization: 'Bearer ' + temporary, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const granted = await post('grant', { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' });
    assert.equal(granted.status, 200);
    assert.equal((await granted.json()).nousAccessEnabled, true);
    assert.equal((await post('revoke')).status, 200);
    assert.equal((await post('grant', { acknowledge: 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS' })).status, 403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
