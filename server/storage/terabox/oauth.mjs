import crypto from 'node:crypto';

const AUTH_BASE = 'https://www.terabox.com';

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function makeSign({ clientId, timestamp, clientSecret, privateSecret }) {
  const payload = `${clientId}_${timestamp}_${clientSecret}_${privateSecret}`;
  return crypto.createHash('md5').update(payload).digest('hex');
}

async function postForm(path, fields, { fetchImpl = globalThis.fetch } = {}) {
  required(fetchImpl, 'fetch implementation');
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  const response = await fetchImpl(`${AUTH_BASE}${path}`, { method: 'POST', body });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  if (!response.ok) throw new Error(`TeraBox OAuth HTTP ${response.status}`);
  if (typeof payload?.errno === 'number' && payload.errno !== 0) {
    throw new Error(payload.show_msg || `TeraBox OAuth errno ${payload.errno}`);
  }
  return payload;
}

export async function exchangeAuthorizationCode({ code, clientId, clientSecret, privateSecret, timestamp = Math.floor(Date.now() / 1000), fetchImpl } = {}) {
  required(code, 'authorization code');
  required(clientId, 'client id');
  required(clientSecret, 'client secret');
  required(privateSecret, 'private secret');
  const sign = makeSign({ clientId, timestamp, clientSecret, privateSecret });
  return postForm('/oauth/gettoken', {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    timestamp,
    sign,
  }, { fetchImpl });
}

export async function refreshAccessToken({ refreshToken, clientId, clientSecret, privateSecret, timestamp = Math.floor(Date.now() / 1000), fetchImpl } = {}) {
  required(refreshToken, 'refresh token');
  required(clientId, 'client id');
  required(clientSecret, 'client secret');
  required(privateSecret, 'private secret');
  const sign = makeSign({ clientId, timestamp, clientSecret, privateSecret });
  return postForm('/oauth/refreshtoken', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    timestamp,
    sign,
  }, { fetchImpl });
}

export async function tokenInfo(accessToken, { fetchImpl } = {}) {
  required(accessToken, 'access token');
  return postForm('/oauth/tokeninfo', { access_token: accessToken }, { fetchImpl });
}

export async function readOnlyHealthCheck({ accessToken, adapterFactory, fetchImpl } = {}) {
  const info = await tokenInfo(accessToken, { fetchImpl });
  const apiDomain = info?.data?.api_domain;
  const uploadDomain = info?.data?.upload_domain;
  required(apiDomain, 'TeraBox api_domain');
  required(adapterFactory, 'adapterFactory');
  const adapter = adapterFactory({ accessToken, apiDomain, uploadDomain, fetchImpl });
  const [user, quota] = await Promise.all([adapter.userInfo(), adapter.quota()]);
  return {
    ok: true,
    apiDomain,
    uploadDomain: uploadDomain ?? null,
    clientId: info?.data?.client_id ?? null,
    user,
    quota,
  };
}

export const __test = { makeSign };
