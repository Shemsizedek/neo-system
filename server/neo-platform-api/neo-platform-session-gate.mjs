import { verifyNeopassToken } from './neopass-google-auth.mjs';

// Server-side authorization boundary shared by NEO Hub, CounterPay, NEOpay and NEO Scan.
// This middleware is intentionally opt-in: it never alters live routes until integrated.
const ALLOWED_PLATFORMS = new Set(['neo-hub', 'counterpay', 'neopay', 'neoscan']);
const ALLOWED_ORIGINS = Object.freeze({
  'neo-hub': 'https://hub.holytemples.org',
  counterpay: 'https://counterpay.holytemples.org',
  neopay: 'https://neopay.holytemples.org',
  neoscan: 'https://neoscan.holytemples.org',
});

export function authorizeNeoPlatformRequest({
  token, platform, secret, issuer = 'neo-pass', now = () => Date.now(),
  permittedRoles = ['member', 'executive-admin'], sessionLookup,
} = {}) {
  if (!ALLOWED_PLATFORMS.has(platform)) return { ok: false, reason: 'unknown_platform' };
  if (typeof secret !== 'string' || secret.length < 32) return { ok: false, reason: 'auth_not_configured' };
  const claims = verifyNeopassToken(token, { secret, issuer, now });
  // Tokens issued for wallet signing, one-time attestations or other purposes are never sessions.
  if (!claims || !claims.sub || !claims.exp || !claims.iat ||
      claims.token_use && claims.token_use !== 'session' ||
      claims.scope && claims.scope !== 'platform:session') {
    return { ok: false, reason: 'invalid_session' };
  }
  if (!Number.isInteger(claims.exp) || !Number.isInteger(claims.iat) ||
      claims.exp <= claims.iat || claims.exp - claims.iat > 8 * 3600) {
    return { ok: false, reason: 'invalid_session_lifetime' };
  }
  if (!claims.aud || !(Array.isArray(claims.aud) ? claims.aud.includes(platform) : claims.aud === platform)) {
    return { ok: false, reason: 'wrong_audience' };
  }
  if (typeof sessionLookup !== 'function') return { ok: false, reason: 'session_registry_unavailable' };
  return { ok: true, subject: claims.sub, platform, claims, permittedRoles };
}

export async function enforceNeoPlatformSession(input = {}) {
  const result = authorizeNeoPlatformRequest(input);
  if (!result.ok) return result;
  try {
    const account = await input.sessionLookup(result.subject);
    if (!account || account.status !== 'active' ||
        !result.permittedRoles.includes(account.role)) return { ok: false, reason: 'access_denied' };
    return { ok: true, platform: result.platform, subject: result.subject, role: account.role };
  } catch {
    return { ok: false, reason: 'session_registry_unavailable' };
  }
}

export function allowedNeoPlatformOrigin(platform) {
  return ALLOWED_ORIGINS[platform] || null;
}
