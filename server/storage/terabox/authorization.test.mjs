import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorizationUrl, publicConnectionSummary } from './authorization.mjs';

test('buildAuthorizationUrl uses the documented TeraBox web authorization page', () => {
  const url = new URL(buildAuthorizationUrl({ clientId: 'client-123', state: 'state-123' }));
  assert.equal(url.origin, 'https://www.terabox.com');
  assert.equal(url.pathname, '/wap/outside/login');
  assert.equal(url.searchParams.get('clientId'), 'client-123');
  assert.equal(url.searchParams.get('state'), 'state-123');
});

test('publicConnectionSummary excludes access and refresh token values', () => {
  const summary = publicConnectionSummary({
    connected: true,
    userId: 42,
    expiresIn: 172800,
    apiDomain: 'https://api.example',
    uploadDomain: 'https://upload.example',
    refreshTokenPresent: true,
    secrets: { accessToken: 'super-secret', refreshToken: 'also-secret' },
    health: { ok: true, clientId: 'client-123', user: { errno: 0 }, quota: { errno: 0 } },
  });

  assert.equal(summary.connected, true);
  assert.equal(summary.refreshTokenPresent, true);
  assert.equal('secrets' in summary, false);
  assert.equal(JSON.stringify(summary).includes('super-secret'), false);
  assert.equal(JSON.stringify(summary).includes('also-secret'), false);
});
