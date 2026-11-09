import { createPrivateKey, randomUUID, sign } from 'node:crypto';
import { verifyNeopassToken } from './neopass-google-auth.mjs';

const ALLOWED_ORIGINS = Object.freeze([
  'https://holytemples.org',
  'https://www.holytemples.org',
]);
const READ_SCOPES = 'nous.agents.read nous.sources.read nous.adapters.read';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function json(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, private',
    'pragma': 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'vary': 'Origin',
  });
  res.end(JSON.stringify(payload));
}

/**
 * Opt-in NEOpass trust boundary: validates existing HS256 session locally and
 * signs short-lived EdDSA *read-only* tokens for Nous. Never gives Nous an HS256 secret.
 * Not enabled in production until explicitly attached and configured.
 */
export function createNousTokenExchange({
  jwtSecret, jwtIssuer, privateKeyPem, tokenIssuer = 'neo-pass-nous-exchange',
  audience = 'neo-nous', authService, now = () => Date.now(),
  allowedOrigins = ALLOWED_ORIGINS,
} = {}) {
  if (!jwtSecret || !jwtIssuer || !privateKeyPem || !tokenIssuer || !audience ||
      !authService || typeof authService.session !== 'function') {
    throw new Error('nous_token_exchange_configuration_required');
  }
  const key = createPrivateKey(privateKeyPem);
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('nous_token_exchange_key_invalid');
  const trustedOrigins = new Set(allowedOrigins);
  return async function nousTokenExchange(req, res, url) {
    if (url.pathname !== '/api/v1/auth/nous-token') return false;
    if (req.method !== 'POST') {
      json(res, 405, { error: 'method_not_allowed' });
      return true;
    }
    // Explicit bearer auth, never a session cookie; avoids CSRF-based minting.
    const origin = req.headers.origin;
    if (origin && !trustedOrigins.has(origin)) {
      json(res, 403, { error: 'origin_not_allowed' });
      return true;
    }
    if (req.headers['transfer-encoding'] || (req.headers['content-length'] && Number(req.headers['content-length']) !== 0)) {
      json(res, 400, { error: 'request_body_not_allowed' });
      return true;
    }
    const authorization = req.headers.authorization;
    if (typeof authorization !== 'string' || !/^Bearer [^ ]{1,8192}$/.test(authorization)) {
      json(res, 401, { error: 'neopass_bearer_required' });
      return true;
    }
    const claims = verifyNeopassToken(authorization.slice(7), { secret: jwtSecret, issuer: jwtIssuer, now });
    const timestamp = Math.floor(now() / 1000);
    // Existing token verifier permits missing exp: explicitly reject that here.
    if (!claims || !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
        claims.iat > timestamp + 30 || claims.exp <= timestamp ||
        claims.exp - claims.iat > 8 * 3600 || claims.iat < timestamp - 8 * 3600 ||
        typeof claims.sub !== 'string' || !claims.sub ||
        (claims.token_use !== undefined && claims.token_use !== 'session')) {
      json(res, 401, { error: 'neopass_session_invalid' });
      return true;
    }
    let member;
    try { member = await authService.session(claims.sub, claims); }
    catch {
      json(res, 503, { error: 'neopass_membership_unavailable' });
      return true;
    }
    if (!member || member.subject !== claims.sub || member.neopassStatus !== 'active') {
      json(res, 403, { error: 'neopass_active_membership_required' });
      return true;
    }
    const issuedAt = timestamp;
    const jwtHeader = encode({ typ: 'JWT', alg: 'EdDSA' });
    const payload = encode({
      iss: tokenIssuer, aud: audience, sub: claims.sub, iat: issuedAt,
      nbf: issuedAt, exp: issuedAt + 120,
      jti: randomUUID(), token_use: 'nous-read', scope: READ_SCOPES,
    });
    const message = jwtHeader + '.' + payload;
    const signature = sign(null, Buffer.from(message), key).toString('base64url');
    json(res, 200, {
      token: message + '.' + signature,
      tokenType: 'Bearer', expiresIn: 120, scope: READ_SCOPES,
      audience, tokenUse: 'nous-read',
    });
    return true;
  };
}
