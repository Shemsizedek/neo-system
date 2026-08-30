import { buildAuthorizationUrl, completeAuthorization, publicConnectionSummary } from './authorization.mjs';
import { refreshAccessToken } from './oauth.mjs';
import { createTokenStoreFromEnv } from './token-store.mjs';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function tokenExpiresAt(record) {
  if (!record?.connectedAt || !Number.isFinite(Number(record?.expiresIn))) return null;
  const connectedAt = Date.parse(record.connectedAt);
  if (!Number.isFinite(connectedAt)) return null;
  return connectedAt + Number(record.expiresIn) * 1000;
}

export function createMemoryTokenStore() {
  let record = null;
  return {
    kind: 'runtime-memory',
    durable: false,
    async set(next) { record = structuredClone(next); },
    async get() { return record ? structuredClone(record) : null; },
    async clear() { record = null; },
  };
}

export function createTeraBoxRuntime({
  env = process.env,
  fetchImpl,
  tokenStore,
  completeAuthorizationFn = completeAuthorization,
  refreshAccessTokenFn = refreshAccessToken,
  now = () => new Date().toISOString(),
  refreshSkewMs = 5 * 60 * 1000,
} = {}) {
  const store = tokenStore || createTokenStoreFromEnv({ env, memoryFactory: createMemoryTokenStore });
  const configured = () => Boolean(env.TERABOX_CLIENT_ID && env.TERABOX_CLIENT_SECRET && env.TERABOX_PRIVATE_SECRET);

  async function refresh(record) {
    if (!configured()) throw new Error('TeraBox application credentials are not configured');
    required(record?.refreshToken, 'TeraBox refresh token');

    const response = await refreshAccessTokenFn({
      refreshToken: record.refreshToken,
      clientId: env.TERABOX_CLIENT_ID,
      clientSecret: env.TERABOX_CLIENT_SECRET,
      privateSecret: env.TERABOX_PRIVATE_SECRET,
      fetchImpl,
    });

    const data = response?.data ?? response ?? {};
    const accessToken = required(data.access_token, 'TeraBox refreshed access token');
    const next = {
      ...record,
      accessToken,
      refreshToken: data.refresh_token || record.refreshToken,
      expiresIn: data.expires_in ?? record.expiresIn ?? null,
      connectedAt: now(),
      refreshedAt: now(),
    };
    await store.set(next);
    return next;
  }

  async function ensureAccessToken({ forceRefresh = false } = {}) {
    let record = await store.get();
    required(record?.accessToken, 'TeraBox access token');

    const expiresAt = tokenExpiresAt(record);
    const currentTime = Date.parse(now());
    const shouldRefresh = forceRefresh || (expiresAt !== null && Number.isFinite(currentTime) && currentTime >= expiresAt - refreshSkewMs);

    if (shouldRefresh) record = await refresh(record);
    return record.accessToken;
  }

  return {
    configured,

    authorizationUrl() {
      required(env.TERABOX_CLIENT_ID, 'TERABOX_CLIENT_ID');
      return buildAuthorizationUrl({ clientId: env.TERABOX_CLIENT_ID });
    },

    async complete(code) {
      required(code, 'TeraBox authorization code');
      if (!configured()) throw new Error('TeraBox application credentials are not configured');

      const result = await completeAuthorizationFn({
        code,
        clientId: env.TERABOX_CLIENT_ID,
        clientSecret: env.TERABOX_CLIENT_SECRET,
        privateSecret: env.TERABOX_PRIVATE_SECRET,
        fetchImpl,
      });

      await store.set({
        accessToken: result.secrets.accessToken,
        refreshToken: result.secrets.refreshToken,
        apiDomain: result.apiDomain,
        uploadDomain: result.uploadDomain,
        userId: result.userId,
        expiresIn: result.expiresIn,
        connectedAt: now(),
        refreshedAt: null,
      });

      return publicConnectionSummary(result);
    },

    ensureAccessToken,

    async refresh() {
      const record = await store.get();
      required(record?.accessToken, 'TeraBox access token');
      const next = await refresh(record);
      return {
        service: 'terabox',
        connected: true,
        userId: next.userId ?? null,
        expiresIn: next.expiresIn ?? null,
        refreshedAt: next.refreshedAt ?? null,
      };
    },

    async status() {
      const record = await store.get();
      const expiresAt = tokenExpiresAt(record);
      return {
        service: 'terabox',
        configured: configured(),
        connected: Boolean(record?.accessToken),
        userId: record?.userId ?? null,
        apiDomain: record?.apiDomain ?? null,
        uploadDomain: record?.uploadDomain ?? null,
        refreshTokenPresent: Boolean(record?.refreshToken),
        connectedAt: record?.connectedAt ?? null,
        refreshedAt: record?.refreshedAt ?? null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        tokenStore: store.kind || 'custom',
        durable: Boolean(store.durable),
      };
    },

    async disconnect() {
      await store.clear();
      return { service: 'terabox', connected: false };
    },
  };
}

export const __test = { tokenExpiresAt };
