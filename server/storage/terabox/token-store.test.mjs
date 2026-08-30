import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEncryptedFileTokenStore, createTokenStoreFromEnv } from './token-store.mjs';

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'neo-terabox-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('encrypted file token store persists and decrypts records', async () => {
  await withTempDir(async dir => {
    const path = join(dir, 'tokens.enc');
    const store = createEncryptedFileTokenStore({ path, encryptionKey: 'correct-horse-battery-staple' });
    await store.set({ accessToken: 'ACCESS_SECRET', refreshToken: 'REFRESH_SECRET', userId: 'u-1' });
    const raw = await readFile(path, 'utf8');
    assert.equal(raw.includes('ACCESS_SECRET'), false);
    assert.equal(raw.includes('REFRESH_SECRET'), false);
    assert.deepEqual(await store.get(), { accessToken: 'ACCESS_SECRET', refreshToken: 'REFRESH_SECRET', userId: 'u-1' });
    assert.equal(store.durable, true);
    assert.equal(store.kind, 'encrypted-file');
  });
});

test('encrypted file token store clear removes persisted record', async () => {
  await withTempDir(async dir => {
    const store = createEncryptedFileTokenStore({ path: join(dir, 'tokens.enc'), encryptionKey: 'key-1' });
    await store.set({ accessToken: 'abc' });
    await store.clear();
    assert.equal(await store.get(), null);
  });
});

test('environment selects durable store only when a path is configured', () => {
  const memory = { kind: 'memory-test', durable: false };
  assert.equal(createTokenStoreFromEnv({ env: {}, memoryFactory: () => memory }), memory);
  const durable = createTokenStoreFromEnv({
    env: { TERABOX_TOKEN_STORE_PATH: '/tmp/terabox.enc', TERABOX_TOKEN_STORE_KEY: 'secret-key' },
    memoryFactory: () => memory,
  });
  assert.equal(durable.kind, 'encrypted-file');
  assert.equal(durable.durable, true);
});
