import test from 'node:test';
import assert from 'node:assert/strict';
import { createTeraBoxRuntime, createMemoryTokenStore } from './runtime.mjs';

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
  assert.ok(url.searchParams.get('state'));
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

  const state = new URL(runtime.authorizationUrl()).searchParams.get('state');
  const summary = await runtime.complete('one-time-code', state);
  assert.equal(summary.connected, true);
  assert.equal(JSON.stringify(summary).includes('ACCESS_SECRET'), false);
  assert.equal(JSON.stringify(summary).includes('REFRESH_SECRET'), false);

  const status = await runtime.status();
  assert.equal(status.connected, true);
  assert.equal(status.userId, 'u-1');
  assert.equal(status.connectedAt, '2026-08-29T12:00:00.000Z');
  assert.equal(status.expiresAt, '2026-08-31T12:00:00.000Z');
  assert.equal(status.durable, false);
});

test('authorization state is required, single-use, and expires', async () => {
  let current = '2026-08-29T12:00:00.000Z';
  const runtime = createTeraBoxRuntime({ env, now: () => current, authorizationStateTtlMs: 1000, completeAuthorizationFn: async () => ({connected:true,secrets:{accessToken:'a',refreshToken:'r'},health:{ok:true}}) });
  const state = new URL(runtime.authorizationUrl()).searchParams.get('state');
  await assert.rejects(runtime.complete('code', 'wrong'), /Invalid or expired/);
  current = '2026-08-29T12:00:02.000Z';
  await assert.rejects(runtime.complete('code', state), /Invalid or expired/);
  const fresh = new URL(runtime.authorizationUrl()).searchParams.get('state');
  await runtime.complete('code', fresh);
  await assert.rejects(runtime.complete('code', fresh), /Invalid or expired/);
});

test('ensureAccessToken keeps a token that is not near expiry', async () => {
  const store = createMemoryTokenStore();
  await store.set({ accessToken: 'ACCESS_1', refreshToken: 'REFRESH_1', expiresIn: 172800, connectedAt: '2026-08-29T12:00:00.000Z' });
  let refreshCalls = 0;
  const runtime = createTeraBoxRuntime({
    env,
    tokenStore: store,
    now: () => '2026-08-30T00:00:00.000Z',
    refreshAccessTokenFn: async () => { refreshCalls += 1; return { data: { access_token: 'ACCESS_2' } }; },
  });
  assert.equal(await runtime.ensureAccessToken(), 'ACCESS_1');
  assert.equal(refreshCalls, 0);
});

test('ensureAccessToken refreshes and persists a token near expiry', async () => {
  const store = createMemoryTokenStore();
  await store.set({ accessToken: 'ACCESS_1', refreshToken: 'REFRESH_1', expiresIn: 3600, connectedAt: '2026-08-30T00:00:00.000Z', userId: 'u-1' });
  let refreshCalls = 0;
  const runtime = createTeraBoxRuntime({
    env,
    tokenStore: store,
    now: () => '2026-08-30T00:56:00.000Z',
    refreshSkewMs: 5 * 60 * 1000,
    refreshAccessTokenFn: async ({ refreshToken, clientId }) => {
      refreshCalls += 1;
      assert.equal(refreshToken, 'REFRESH_1');
      assert.equal(clientId, 'client-1');
      return { data: { access_token: 'ACCESS_2', refresh_token: 'REFRESH_2', expires_in: 172800 } };
    },
  });

  assert.equal(await runtime.ensureAccessToken(), 'ACCESS_2');
  assert.equal(refreshCalls, 1);
  const saved = await store.get();
  assert.equal(saved.accessToken, 'ACCESS_2');
  assert.equal(saved.refreshToken, 'REFRESH_2');
  assert.equal(saved.expiresIn, 172800);
  assert.equal(saved.refreshedAt, '2026-08-30T00:56:00.000Z');
});

test('status reports unconfigured runtime safely', async () => {
  const runtime = createTeraBoxRuntime({ env: {} });
  const status = await runtime.status();
  assert.equal(status.configured, false);
  assert.equal(status.connected, false);
});
