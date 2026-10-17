/** NSEC-025: NEO Pass-to-Noogle identity boundary; no HTTP routing. */
import { verifyNeopassToken } from '../../server/neo-platform-api/neopass-google-auth.mjs';

export function verifyNoogleIdentity(token, { secret, issuer = 'neo-pass', now = () => Date.now() } = {}) {
  // Caller must obtain token from a trusted transport and MUST check CSRF for cookie-originated writes.
  if (!secret || !token) return null;
  const claims = verifyNeopassToken(token, { secret, issuer, now });
  if (!claims || typeof claims.sub !== 'string' || !claims.sub.trim()) return null;
  // Protect against substituting Crown-office, Oracle, browser and other scoped access tokens.
  if (claims.scope || claims.token_use || claims.role === 'service') return null;
  if (!Number.isSafeInteger(claims.exp) || claims.exp <= Math.floor(now() / 1000)) return null;
  if (!Number.isSafeInteger(claims.iat) || claims.iat > Math.floor(now() / 1000) + 30) return null;
  return Object.freeze({ subject: claims.sub });
}
export function authorizeNoogleEnrollment({ identity, csrfValidated = false, freshLogin = false } = {}) {
  if (!identity?.subject || !csrfValidated || !freshLogin) throw new Error('noogle_enrollment_requires_fresh_neopass_identity');
  return Object.freeze({ subject: identity.subject });
}
export function authorizeNoogleTerminal() { throw new Error('noogle_remote_terminal_disabled'); }
