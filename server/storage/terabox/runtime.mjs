import { buildAuthorizationUrl, completeAuthorization, publicConnectionSummary } from './authorization.mjs';
import { refreshAccessToken } from './oauth.mjs';
import { createTokenStoreFromEnv } from './token-store.mjs';
import { createTeraBoxAdapter } from './adapter.mjs';
import crypto from 'node:crypto';

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
  adapterFactory = createTeraBoxAdapter,
  now = () => new Date().toISOString(),
  refreshSkewMs = 5 * 60 * 1000,
  authorizationStateTtlMs = 10 * 60 * 1000,
} = {}) {
  const store = tokenStore || createTokenStoreFromEnv({ env, memoryFactory: createMemoryTokenStore });
  const configured = () => Boolean(env.TERABOX_CLIENT_ID && env.TERABOX_CLIENT_SECRET && env.TERABOX_PRIVATE_SECRET);
  const liveMode = () => env.TERABOX_LIVE_MODE || 'read-only';
  const pendingStates = new Map();

  function pruneStates(currentTime = Date.parse(now())) {
    for (const [state, expiresAt] of pendingStates) if (expiresAt <= currentTime) pendingStates.delete(state);
  }

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
    const refreshedAt = now();
    const next = {
      ...record,
      accessToken,
      refreshToken: data.refresh_token || record.refreshToken,
      expiresIn: data.expires_in ?? record.expiresIn ?? null,
      connectedAt: refreshedAt,
      refreshedAt,
    };
    await store.set(next);
    return next;
  }

  async function ensureRecord({ forceRefresh = false } = {}) {
    let record = await store.get();
    required(record?.accessToken, 'TeraBox access token');

    const expiresAt = tokenExpiresAt(record);
    const currentTime = Date.parse(now());
    const shouldRefresh = forceRefresh || (expiresAt !== null && Number.isFinite(currentTime) && currentTime >= expiresAt - refreshSkewMs);

    if (shouldRefresh) record = await refresh(record);
    return record;
  }

  async function ensureAccessToken(options = {}) {
    return (await ensureRecord(options)).accessToken;
  }

  async function client(options = {}) {
    const record = await ensureRecord(options);
    return adapterFactory({
      accessToken: record.accessToken,
      apiDomain: required(record.apiDomain, 'TeraBox api domain'),
      uploadDomain: record.uploadDomain ?? undefined,
      fetchImpl,
    });
  }

  async function fileOperation({ operation, filelist, asyncMode = 1 } = {}) {
    if (liveMode() !== 'controlled-write') throw new Error('TeraBox controlled-write mode is required');
    if (!['copy', 'move', 'rename', 'delete'].includes(operation)) throw new Error('Unsupported TeraBox file operation');
    if (!Array.isArray(filelist) || filelist.length === 0 || filelist.length > 100) throw new Error('filelist must contain 1-100 entries');
    const teraBox = await client();
    return teraBox.fileManager({ operation, filelist, asyncMode });
  }

  return {
    configured,
    liveMode,

    authorizationUrl() {
      required(env.TERABOX_CLIENT_ID, 'TERABOX_CLIENT_ID');
      const currentTime = Date.parse(now());
      pruneStates(currentTime);
      const state = crypto.randomBytes(32).toString('base64url');
      pendingStates.set(state, currentTime + authorizationStateTtlMs);
      return buildAuthorizationUrl({ clientId: env.TERABOX_CLIENT_ID, state });
    },

    async complete(code, state) {
      required(code, 'TeraBox authorization code');
      required(state, 'TeraBox OAuth state');
      if (!configured()) throw new Error('TeraBox application credentials are not configured');
      const currentTime = Date.parse(now());
      pruneStates(currentTime);
      const expiresAt = pendingStates.get(state);
      pendingStates.delete(state);
      if (!expiresAt || expiresAt <= currentTime) throw new Error('Invalid or expired TeraBox OAuth state');

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
    client,
    fileOperation,

    async refresh() {
      const record = await store.get();
      required(record?.accessToken, 'TeraBox access token');
      const next = await refresh(record);
      return {
        service: 'terabox',
        liveMode: liveMode(),
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
        liveMode: liveMode(),
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
