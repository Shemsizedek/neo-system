import { exchangeAuthorizationCode, readOnlyHealthCheck } from './oauth.mjs';
import { createTeraBoxAdapter } from './adapter.mjs';

const AUTH_PAGE = 'https://www.terabox.com/wap/outside/login';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function buildAuthorizationUrl({ clientId, state } = {}) {
  required(clientId, 'TeraBox client id');
  const url = new URL(AUTH_PAGE);
  url.searchParams.set('clientId', clientId);
  if (state) url.searchParams.set('state', state);
  return url.toString();
}

export async function completeAuthorization({
  code,
  clientId = process.env.TERABOX_CLIENT_ID,
  clientSecret = process.env.TERABOX_CLIENT_SECRET,
  privateSecret = process.env.TERABOX_PRIVATE_SECRET,
  fetchImpl,
  adapterFactory = createTeraBoxAdapter,
} = {}) {
  required(code, 'TeraBox authorization code');
  required(clientId, 'TeraBox client id');
  required(clientSecret, 'TeraBox client secret');
  required(privateSecret, 'TeraBox private secret');

  const tokenResponse = await exchangeAuthorizationCode({
    code,
    clientId,
    clientSecret,
    privateSecret,
    fetchImpl,
  });

  const accessToken = tokenResponse?.data?.access_token;
  const refreshToken = tokenResponse?.data?.refresh_token;
  required(accessToken, 'TeraBox access token');

  const health = await readOnlyHealthCheck({
    accessToken,
    adapterFactory,
    fetchImpl,
  });

  return {
    connected: true,
    expiresIn: tokenResponse?.data?.expires_in ?? null,
    userId: tokenResponse?.data?.user_id ?? null,
    refreshTokenPresent: Boolean(refreshToken),
    apiDomain: health.apiDomain,
    uploadDomain: health.uploadDomain,
    health,
    secrets: {
      accessToken,
      refreshToken: refreshToken ?? null,
    },
  };
}

export function publicConnectionSummary(result) {
  required(result, 'authorization result');
  return {
    connected: Boolean(result.connected),
    userId: result.userId ?? null,
    expiresIn: result.expiresIn ?? null,
    apiDomain: result.apiDomain ?? null,
    uploadDomain: result.uploadDomain ?? null,
    refreshTokenPresent: Boolean(result.refreshTokenPresent),
    health: result.health ? {
      ok: Boolean(result.health.ok),
      clientId: result.health.clientId ?? null,
      user: result.health.user ?? null,
      quota: result.health.quota ?? null,
    } : null,
  };
}
