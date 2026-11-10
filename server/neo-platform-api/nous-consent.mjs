import { verifyNeopassToken } from './neopass-google-auth.mjs';

const ALLOWED_ORIGINS = new Set(['https://holytemples.org', 'https://www.holytemples.org']);
const CONSENT_ACK = 'ENABLE_NOUS_READ_ONLY_FOR_24_HOURS';

const reply = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store, private',
    'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'vary': 'Origin',
  });
  res.end(JSON.stringify(body));
};

async function parseBody(req) {
  if (req.headers['transfer-encoding']) throw Object.assign(new Error('body_not_allowed'), { status: 400 });
  const length = req.headers['content-length'];
  if (length && (!/^\d+$/.test(String(length)) || Number(length) > 512)) throw Object.assign(new Error('invalid_consent_request'), { status: 400 });
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 512) throw Object.assign(new Error('invalid_consent_request'), { status: 400 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('invalid_consent_request'), { status: 400 }); }
}

/**
 * Explicit and revocable NEOpass consent only. Disabled at routing layer unless
 * NOUS_CONSENT_ENABLED=true. No admin override, no role grants, no auto-enrollment.
 */
export function createNousConsentHandler({ jwtSecret, jwtIssuer = 'neo-pass', registry, now = () => Date.now() } = {}) {
  if (!jwtSecret || !jwtIssuer || !registry ||
      typeof registry.getNEOpassCredential !== 'function' ||
      typeof registry.setNEOpassNousAccess !== 'function') throw new Error('nous_consent_configuration_required');

  return async function handleNousConsent(req, res, url) {
    const operation = url.pathname === '/api/v1/auth/nous-consent/status' ? 'status' :
      url.pathname === '/api/v1/auth/nous-consent/grant' ? 'grant' :
      url.pathname === '/api/v1/auth/nous-consent/revoke' ? 'revoke' : null;
    if (!operation) return false;
    if (req.method !== (operation === 'status' ? 'GET' : 'POST')) {
      reply(res, 405, { error: 'method_not_allowed' }); return true;
    }
    // Reject cookie-only auth and untrusted web origins. Bearer tokens are required.
    if (req.headers.origin && !ALLOWED_ORIGINS.has(req.headers.origin)) {
      reply(res, 403, { error: 'origin_not_allowed' }); return true;
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [a-zA-Z0-9_.-]{1,8192}$/.test(authorization)) {
      reply(res, 401, { error: 'neopass_bearer_required' }); return true;
    }
    const claims = verifyNeopassToken(authorization.slice(7), { secret: jwtSecret, issuer: jwtIssuer, now });
    const epoch = Math.floor(now() / 1000);
    if (!claims || claims.token_use !== 'session' || claims.aud !== 'neopass-session' ||
        typeof claims.sub !== 'string' || !claims.sub ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        claims.iat > epoch + 30 || claims.exp <= epoch || claims.exp <= claims.iat ||
        claims.exp - claims.iat > 8 * 3600 ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > epoch))) {
      reply(res, 401, { error: 'neopass_session_invalid' }); return true;
    }
    if (operation !== 'status' && epoch - claims.iat > 5 * 60) {
      reply(res, 401, { error: 'fresh_neopass_signin_required' }); return true;
    }
    try {
      if (operation === 'status') {
        const credential = await registry.getNEOpassCredential(claims.sub);
        if (!credential || credential.subject !== claims.sub) {
          reply(res, 404, { error: 'neopass_credential_not_found' }); return true;
        }
        if (Number.isSafeInteger(credential.sessionRevokedAfter) && claims.iat <= credential.sessionRevokedAfter) {
          reply(res, 403, { error: 'neopass_session_revoked' }); return true;
        }
        const expiry = credential.nousAccessExpiresAt
          ? Date.parse(credential.nousAccessExpiresAt) : NaN;
        reply(res, 200, {
          nousAccessEnabled: credential.nousAccessEnabled === true && credential.status === 'active' &&
            credential.disabled !== true && credential.suspended !== true &&
            Number.isFinite(expiry) && expiry > now(),
          expiresAt: credential.nousAccessExpiresAt || null,
        });
        return true;
      }
      if (operation === 'grant') {
        const body = await parseBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body) ||
            Object.keys(body).length !== 1 || body.acknowledge !== CONSENT_ACK) {
          reply(res, 400, { error: 'explicit_consent_required' }); return true;
        }
      } else if ((req.headers['content-length'] && Number(req.headers['content-length']) > 0) || req.headers['transfer-encoding']) {
        reply(res, 400, { error: 'body_not_allowed' }); return true;
      }
      const result = await registry.setNEOpassNousAccess(claims.sub, {
        enabled: operation === 'grant',
        sessionIssuedAt: claims.iat,
        nowEpochSeconds: epoch,
      });
      reply(res, 200, { nousAccessEnabled: result.nousAccessEnabled, expiresAt: result.nousAccessExpiresAt || null });
    } catch (error) {
      const status = error.status === 400 ? 400 : error.code === 'nous_credential_not_found' ? 404 :
        error.code === 'nous_member_not_active' || error.code === 'neopass_session_revoked' ? 403 : 503;
      const code = ['nous_credential_not_found', 'nous_member_not_active', 'neopass_session_revoked']
        .includes(error.code) ? error.code : (status === 400 ? 'invalid_consent_request' : 'neopass_registry_unavailable');
      reply(res, status, { error: code });
    }
    return true;
  };
}
