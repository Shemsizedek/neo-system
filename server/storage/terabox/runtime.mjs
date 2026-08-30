import { buildAuthorizationUrl, completeAuthorization, publicConnectionSummary } from './authorization.mjs';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function createMemoryTokenStore() {
  let record = null;
  return {
    async set(next) { record = structuredClone(next); },
    async get() { return record ? structuredClone(record) : null; },
    async clear() { record = null; },
  };
}

export function createTeraBoxRuntime({
  env = process.env,
  fetchImpl,
  tokenStore = createMemoryTokenStore(),
  completeAuthorizationFn = completeAuthorization,
  now = () => new Date().toISOString(),
} = {}) {
  const configured = () => Boolean(env.TERABOX_CLIENT_ID && env.TERABOX_CLIENT_SECRET && env.TERABOX_PRIVATE_SECRET);

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

      await tokenStore.set({
        accessToken: result.secrets.accessToken,
        refreshToken: result.secrets.refreshToken,
        apiDomain: result.apiDomain,
        uploadDomain: result.uploadDomain,
        userId: result.userId,
        expiresIn: result.expiresIn,
        connectedAt: now(),
      });

      return publicConnectionSummary(result);
    },

    async status() {
      const record = await tokenStore.get();
      return {
        service: 'terabox',
        configured: configured(),
        connected: Boolean(record?.accessToken),
        userId: record?.userId ?? null,
        apiDomain: record?.apiDomain ?? null,
        uploadDomain: record?.uploadDomain ?? null,
        refreshTokenPresent: Boolean(record?.refreshToken),
        connectedAt: record?.connectedAt ?? null,
        tokenStore: 'runtime-memory',
        durable: false,
      };
    },

    async disconnect() {
      await tokenStore.clear();
      return { service: 'terabox', connected: false };
    },
  };
}
