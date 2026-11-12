import { issueNeopassToken, verifyNeopassToken } from './neopass-google-auth.mjs';

const CONSENT_TOKEN_TTL_SECONDS = 120;
const LOGIN_FRESHNESS_SECONDS = 300;

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, private',
    'pragma': 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'vary': 'Origin',
  });
  res.end(JSON.stringify(body));
}

function getSessionCookie(req) {
  const raw = String(req.headers.cookie || '');
  const cookie = raw.split(';').map(part => part.trim()).find(part => part.startsWith('neo_pass_session='));
  if (!cookie) return null;
  try { return decodeURIComponent(cookie.slice('neo_pass_session='.length)); }
  catch { return null; }
}

/**
 * Same-origin, session-cookie-to-brief-consent-intent exchange for the member UI.
 * An HttpOnly session remains on the server; only the narrowly scoped two-minute
 * consent-intent credential is returned to page JavaScript.
 */
export function createNousConsentIntentHandler({
  jwtSecret, jwtIssuer = 'neo-pass', registry, now = () => Date.now(),
} = {}) {
  if (!jwtSecret || !jwtIssuer || typeof registry?.getNEOpassCredential !== 'function') {
    throw new Error('nous_consent_intent_configuration_required');
  }
  return async (req, res, url) => {
    if (url.pathname !== '/api/v1/auth/nous-consent/intent') return false;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'method_not_allowed' }); return true;
    }
    // The UI and token issuer share the same host. Never enable cross-site CORS.
    const origin = req.headers.origin;
    if ((origin && origin !== 'https://egov.holytemples.org') ||
        (req.headers['sec-fetch-site'] && req.headers['sec-fetch-site'] !== 'same-origin' &&
         req.headers['sec-fetch-site'] !== 'none')) {
      sendJson(res, 403, { error: 'same_origin_required' }); return true;
    }
    const cookieToken = getSessionCookie(req);
    const claims = verifyNeopassToken(cookieToken, { secret: jwtSecret, issuer: jwtIssuer, now });
    const current = Math.floor(now() / 1000);
    if (!claims || claims.token_use !== 'session' || claims.aud !== 'neopass-session' ||
        !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        typeof claims.sub !== 'string' || !claims.sub ||
        claims.iat > current + 30 || current - claims.iat > LOGIN_FRESHNESS_SECONDS ||
        claims.exp <= current || claims.exp - claims.iat > 8 * 3600 ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > current))) {
      sendJson(res, 401, { error: 'fresh_neopass_signin_required' }); return true;
    }
    let credential;
    try { credential = await registry.getNEOpassCredential(claims.sub); }
    catch { sendJson(res, 503, { error: 'registry_unavailable' }); return true; }
    if (!credential || credential.subject !== claims.sub || credential.status !== 'active' ||
        credential.disabled === true || credential.suspended === true ||
        (credential.sessionRevokedAfter !== undefined && credential.sessionRevokedAfter !== null &&
         (!Number.isSafeInteger(credential.sessionRevokedAfter) || claims.iat <= credential.sessionRevokedAfter))) {
      sendJson(res, 403, { error: 'active_neopass_credential_required' }); return true;
    }
    const expiresIn = Math.min(CONSENT_TOKEN_TTL_SECONDS, claims.exp - current);
    const token = issueNeopassToken({
      subject: claims.sub, secret: jwtSecret, issuer: jwtIssuer, now,
      ttlSeconds: expiresIn,
      claims: {
        token_use: 'nous-consent-intent',
        aud: 'neopass-consent',
        scope: 'nous:consent:self',
        auth_time: claims.iat,
      },
    });
    sendJson(res, 200, { token, tokenType: 'Bearer', expiresIn });
    return true;
  };
}
