import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { attachNeopassBrowserTokenExchange } from './browser-token-exchange.mjs';
import { BROWSER_TOKEN_TTL_SECONDS, createGoogleNeopassAuth } from './neopass-google-auth.mjs';

async function withServer(server, fn) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function decodePayload(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

test('browser token is short-lived and scoped to Oracle execution', async () => {
  const nowMs = Date.parse('2026-09-13T19:00:00Z');
  const record = {
    subject: 'google:member-1',
    email: 'member@example.com',
    displayName: 'Temple Member',
    status: 'active',
    role: 'member',
  };
  const auth = createGoogleNeopassAuth({
    clientId: 'client.apps.googleusercontent.com',
    jwtSecret: 'test-secret',
    jwtIssuer: 'neo-pass',
    registry: {
      getNEOpassCredential: async () => record,
      getNEOpassCredentialByLogin: async () => record,
      upsert: async (_collection, value) => value,
    },
    verifyGoogleCredential: async () => ({ sub: 'member-1', email: record.email, email_verified: true }),
    now: () => nowMs,
  });

  const result = await auth.browserToken(record.subject);
  const payload = decodePayload(result.token);
  assert.equal(payload.sub, record.subject);
  assert.equal(payload.scope, 'neo:oracle:execute');
  assert.equal(payload.token_use, 'browser');
  assert.equal(payload.exp - payload.iat, BROWSER_TOKEN_TTL_SECONDS);
  assert.equal(result.expiresAt, payload.exp);
});

test('browser token exchange allows only trusted Temple origins with credentials', async () => {
  const base = http.createServer((_req, res) => {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end('{"error":"fallback"}');
  });
  attachNeopassBrowserTokenExchange(base, {
    authService: {
      browserToken: async subject => ({ token: 'scoped-token', expiresAt: 1234567890, member: { subject, neopassStatus: 'active' } }),
    },
    subjectResolver: req => req.headers.cookie === 'neo_pass_session=valid' ? 'google:member-1' : null,
  });

  await withServer(base, async url => {
    const response = await fetch(`${url}/api/v1/auth/browser-token`, {
      headers: { origin: 'https://holytemples.org', cookie: 'neo_pass_session=valid' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://holytemples.org');
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    const payload = await response.json();
    assert.equal(payload.token, 'scoped-token');
    assert.equal(payload.scope, 'neo:oracle:execute');

    const unauthenticated = await fetch(`${url}/api/v1/auth/browser-token`, {
      headers: { origin: 'https://holytemples.org' },
    });
    assert.equal(unauthenticated.status, 401);

    const blocked = await fetch(`${url}/api/v1/auth/browser-token`, {
      headers: { origin: 'https://example.com', cookie: 'neo_pass_session=valid' },
    });
    assert.equal(blocked.status, 403);

    const preflight = await fetch(`${url}/api/v1/auth/browser-token`, {
      method: 'OPTIONS',
      headers: { origin: 'https://holytemples.org' },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  });
});
