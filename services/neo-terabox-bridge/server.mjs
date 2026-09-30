import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';

const env = process.env;
const PORT = Number(env.PORT || 8080);
const REQUIRED = [
  'TERABOX_API_BASE',
  'TERABOX_AUTHORIZE_URL',
  'TERABOX_TOKEN_URL',
  'TERABOX_CLIENT_ID',
  'TERABOX_CLIENT_SECRET',
  'TERABOX_REDIRECT_URI',
  'NEO_INTERNAL_API_KEY'
];

const missing = REQUIRED.filter((k) => !env[k]);
if (missing.length) console.warn(`[neo-terabox-bridge] missing env: ${missing.join(', ')}`);

const sessions = new Map();
const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  });
  res.end(data);
};

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

const constantTimeEqual = (a, b) => {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};

const random = () => crypto.randomBytes(32).toString('base64url');

async function readBody(req, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('request_too_large');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: env.TERABOX_CLIENT_ID,
    client_secret: env.TERABOX_CLIENT_SECRET,
    redirect_uri: env.TERABOX_REDIRECT_URI
  });

  const r = await fetch(env.TERABOX_TOKEN_URL, {
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    body,
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error(`terabox_token_exchange_${r.status}`);
  return r.json();
}

async function teraboxFetch(path, accessToken, init = {}) {
  const url = new URL(path, env.TERABOX_API_BASE).toString();
  const r = await fetch(url, {
    ...init,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(20000)
  });
  const text = await r.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = {raw: text}; }
  if (!r.ok) throw new Error(`terabox_api_${r.status}:${JSON.stringify(payload)}`);
  return payload;
}

async function dispatchToNeo(target, payload) {
  const targets = {
    gateway: env.NEO_GATEWAY_URL,
    router: env.NEO_ROUTER_URL,
    neosync: env.NEOSYNC_URL,
    oracle: env.NEO_ORACLE_URL
  };
  const base = targets[target];
  if (!base) throw new Error('neo_target_not_configured');
  const r = await fetch(base, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${env.NEO_INTERNAL_API_KEY}`,
      'x-neo-source': 'neo-terabox-bridge'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000)
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`neo_dispatch_${r.status}:${text}`);
  try { return JSON.parse(text); } catch { return {ok: true, raw: text}; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'neo-terabox-bridge',
        mode: env.NODE_ENV || 'production',
        teraboxConfigured: REQUIRED.slice(0, 6).every((k) => !!env[k]),
        neoConfigured: !!env.NEO_INTERNAL_API_KEY,
        time: new Date().toISOString()
      });
    }

    if (req.method === 'GET' && url.pathname === '/v1/terabox/connect') {
      if (!constantTimeEqual(bearer(req), env.NEO_INTERNAL_API_KEY)) return json(res, 401, {error: 'unauthorized'});
      const state = random();
      const nonce = random();
      sessions.set(state, {nonce, createdAt: Date.now()});
      const auth = new URL(env.TERABOX_AUTHORIZE_URL);
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('client_id', env.TERABOX_CLIENT_ID);
      auth.searchParams.set('redirect_uri', env.TERABOX_REDIRECT_URI);
      auth.searchParams.set('state', state);
      if (env.TERABOX_SCOPES) auth.searchParams.set('scope', env.TERABOX_SCOPES);
      return json(res, 200, {authorize_url: auth.toString(), state});
    }

    if (req.method === 'GET' && url.pathname === '/v1/terabox/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const record = state && sessions.get(state);
      if (!code || !record || Date.now() - record.createdAt > 10 * 60_000) return json(res, 400, {error: 'invalid_oauth_callback'});
      sessions.delete(state);
      const token = await exchangeCode(code);
      const sid = random();
      sessions.set(sid, {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: token.expires_in ? Date.now() + Number(token.expires_in) * 1000 : null
      });
      return json(res, 200, {ok: true, session_id: sid, expires_in: token.expires_in || null});
    }

    if (req.method === 'GET' && url.pathname === '/v1/terabox/me') {
      const sid = req.headers['x-neo-terabox-session'];
      const session = sessions.get(String(sid || ''));
      if (!session?.accessToken) return json(res, 401, {error: 'invalid_session'});
      const data = await teraboxFetch('/openapi/uinfo', session.accessToken);
      return json(res, 200, data);
    }

    if (req.method === 'POST' && url.pathname === '/v1/bridge/dispatch') {
      if (!constantTimeEqual(bearer(req), env.NEO_INTERNAL_API_KEY)) return json(res, 401, {error: 'unauthorized'});
      const body = await readBody(req);
      if (!['gateway', 'router', 'neosync', 'oracle'].includes(body.target)) return json(res, 400, {error: 'invalid_target'});
      const result = await dispatchToNeo(body.target, {
        type: body.type || 'terabox.event',
        source: 'neo-terabox-bridge',
        occurred_at: new Date().toISOString(),
        payload: body.payload ?? {}
      });
      return json(res, 200, {ok: true, result});
    }

    return json(res, 404, {error: 'not_found'});
  } catch (err) {
    console.error('[neo-terabox-bridge]', err);
    return json(res, 500, {error: 'internal_error'});
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[neo-terabox-bridge] listening on :${PORT}`);
});
