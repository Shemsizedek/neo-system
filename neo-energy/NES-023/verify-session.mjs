// NES-023 strict HS256 NEO Energy token-validation adapter.
// Test/staging only. Production provider and session revocation remain unconnected.
import { createHmac, timingSafeEqual } from 'node:crypto';

export class SessionError extends Error {}

function parsePart(part) {
  const json = Buffer.from(part, 'base64url').toString('utf8');
  return JSON.parse(json);
}

export function verifyEnergySession(token, {
  secret, issuer, audience, nowSeconds = Math.floor(Date.now() / 1000)
} = {}) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32 ||
      typeof issuer !== 'string' || !issuer ||
      typeof audience !== 'string' || !audience)
    throw new SessionError('verifier_not_configured');
  if (typeof token !== 'string' || token.length > 8192)
    throw new SessionError('invalid_session');
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(p => !/^[a-zA-Z0-9_-]+$/.test(p)))
    throw new SessionError('invalid_session');
  const expected = createHmac('sha256', secret)
    .update(parts[0] + '.' + parts[1]).digest();
  const actual = Buffer.from(parts[2], 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new SessionError('invalid_signature');
  let header, claims;
  try { header = parsePart(parts[0]); claims = parsePart(parts[1]); }
  catch { throw new SessionError('invalid_payload'); }
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT' ||
      header.crit !== undefined || !claims || Array.isArray(claims) ||
      typeof claims.sub !== 'string' || !claims.sub.trim() ||
      claims.iss !== issuer || claims.aud !== audience ||
      claims.token_use !== 'energy-customer' ||
      !Number.isSafeInteger(claims.exp) || claims.exp <= nowSeconds ||
      !Number.isSafeInteger(claims.iat) || claims.iat > nowSeconds + 60 ||
      (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > nowSeconds)))
    throw new SessionError('invalid_claims');
  // Never accept authorization grants embedded in a token. Resolve them in the backend.
  return Object.freeze({ subject: claims.sub, issuer, audience, expiresAt: claims.exp });
}
