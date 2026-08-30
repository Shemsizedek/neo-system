import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeraBoxRuntime } from './runtime.mjs';

const env = {
  TERABOX_CLIENT_ID: 'client-1',
  TERABOX_CLIENT_SECRET: 'secret-1',
  TERABOX_PRIVATE_SECRET: 'private-1',
};

test('authorizationUrl uses configured client id', () => {
  const runtime = createTeraBoxRuntime({ env });
  const url = new URL(runtime.authorizationUrl());
  assert.equal(url.hostname, 'www.terabox.com');
  assert.equal(url.searchParams.get('clientId'), 'client-1');
});

test('complete stores secrets internally but returns redacted summary', async () => {
  const runtime = createTeraBoxRuntime({
    env,
    now: () => '2026-08-29T12:00:00.000Z',
    completeAuthorizationFn: async () => ({
      connected: true,
      userId: 'u-1',
      expiresIn: 172800,
      refreshTokenPresent: true,
      apiDomain: 'https://api.example',
      uploadDomain: 'https://upload.example',
      health: { ok: true, clientId: 'client-1', user: { errno: 0 }, quota: { errno: 0 } },
      secrets: { accessToken: 'ACCESS_SECRET', refreshToken: 'REFRESH_SECRET' },
    }),
  });

  const summary = await runtime.complete('one-time-code');
  assert.equal(summary.connected, true);
  assert.equal(JSON.stringify(summary).includes('ACCESS_SECRET'), false);
  assert.equal(JSON.stringify(summary).includes('REFRESH_SECRET'), false);

  const status = await runtime.status();
  assert.equal(status.connected, true);
  assert.equal(status.userId, 'u-1');
  assert.equal(status.connectedAt, '2026-08-29T12:00:00.000Z');
  assert.equal(status.durable, false);
});

test('status reports unconfigured runtime safely', async () => {
  const runtime = createTeraBoxRuntime({ env: {} });
  const status = await runtime.status();
  assert.equal(status.configured, false);
  assert.equal(status.connected, false);
});
