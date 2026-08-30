import crypto from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function normalizeKey(secret) {
  required(secret, 'token store encryption key');
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptJson(value, secret) {
  const key = normalizeKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: ciphertext.toString('base64'),
  });
}

function decryptJson(serialized, secret) {
  const payload = JSON.parse(serialized);
  if (payload?.v !== 1 || payload?.alg !== 'aes-256-gcm') throw new Error('Unsupported TeraBox token-store payload');
  const key = normalizeKey(secret);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString('utf8'));
}

export function createEncryptedFileTokenStore({ path, encryptionKey } = {}) {
  required(path, 'token store path');
  required(encryptionKey, 'token store encryption key');

  return {
    kind: 'encrypted-file',
    durable: true,
    async set(record) {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, encryptJson(record, encryptionKey), { encoding: 'utf8', mode: 0o600 });
      await rename(tmp, path);
    },
    async get() {
      try {
        return decryptJson(await readFile(path, 'utf8'), encryptionKey);
      } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
      }
    },
    async clear() {
      await rm(path, { force: true });
    },
  };
}

export function createTokenStoreFromEnv({ env = process.env, memoryFactory } = {}) {
  if (env.TERABOX_TOKEN_STORE_PATH) {
    return createEncryptedFileTokenStore({
      path: env.TERABOX_TOKEN_STORE_PATH,
      encryptionKey: required(env.TERABOX_TOKEN_STORE_KEY, 'TERABOX_TOKEN_STORE_KEY'),
    });
  }
  return memoryFactory();
}

export const __test = { encryptJson, decryptJson };
