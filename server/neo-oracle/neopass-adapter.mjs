/**
 * NEO Oracle NEOpass verifier adapter.
 *
 * Reuses the existing NEOpass browser token issuer for the narrowly scoped
 * neo:oracle:execute operation. The token alone NEVER grants paid access.
 * An authoritative membership record is checked fresh on each invocation.
 */
import { verifyNeopassToken, BROWSER_TOKEN_TTL_SECONDS } from "../neo-platform-api/neopass-google-auth.mjs";

export function createOracleNeopassVerifier({ jwtSecret, registry, issuer = "neo-pass", now = () => Date.now() } = {}) {
  if (typeof jwtSecret !== "string" || jwtSecret.length < 32 ||
      typeof registry?.getNEOpassCredential !== "function") {
    throw new Error("oracle_neopass_verifier_not_configured");
  }
  return async function verifyOracleNeopassSession(token) {
    const claims = verifyNeopassToken(token, { secret: jwtSecret, issuer, now });
    const clock = now();
    const issuedAtMs = Number(claims?.iat) * 1000;
    const expiresAtMs = Number(claims?.exp) * 1000;
    if (!claims || claims.scope !== "neo:oracle:execute" ||
        claims.token_use !== "browser" ||
        typeof claims.sub !== "string" || claims.sub.length < 8 || claims.sub.length > 256 ||
        !Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs) ||
        issuedAtMs > clock + 60_000 || expiresAtMs <= clock ||
        expiresAtMs - issuedAtMs > BROWSER_TOKEN_TTL_SECONDS * 1000) return null;

    // Never trust role or membership claims from the token, even if signed.
    // Missing/disabled membership fails closed; errors propagate as service unavailable.
    const record = await registry.getNEOpassCredential(claims.sub);
    if (!record || record.subject !== claims.sub || record.status !== "active") return null;
    return {
      verified: true,
      subject: claims.sub,
      audience: "neo-oracle",
      scopes: ["oracle.execute"],
      expiresAtMs
    };
  };
}
