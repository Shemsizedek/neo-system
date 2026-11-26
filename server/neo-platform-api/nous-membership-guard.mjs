/**
 * Re-check the authoritative NEOpass credential registry at exchange time.
 * The registry is authoritative; HS256 session claims must not elevate status.
 * Missing consent and legacy records fail closed.
 */
export function createNousMembershipGuard({ getCredential, now = () => Date.now() } = {}) {
  if (typeof getCredential !== 'function') throw new TypeError('nous_credential_lookup_required');
  return async function verifyNousMembership(claims) {
    if (!claims || typeof claims.sub !== 'string' || !claims.sub || !Number.isSafeInteger(claims.iat)) return false;
    const record = await getCredential(claims.sub);
    if (!record || record.subject !== claims.sub || record.status !== 'active' ||
        record.nousAccessEnabled !== true || record.disabled === true || record.suspended === true) return false;
    // Strict session invalidation cutoff (epoch seconds).
    // Users with no cutoff are supported only if explicitly opted in.
    if (record.sessionRevokedAfter !== undefined && record.sessionRevokedAfter !== null) {
      if (!Number.isSafeInteger(record.sessionRevokedAfter) ||
          claims.iat <= record.sessionRevokedAfter) return false;
    }
    if (record.nousAccessExpiresAt !== undefined && record.nousAccessExpiresAt !== null) {
      const until = typeof record.nousAccessExpiresAt === 'number'
        ? record.nousAccessExpiresAt : Date.parse(record.nousAccessExpiresAt) / 1000;
      if (!Number.isFinite(until) || until <= Math.floor(now() / 1000)) return false;
    }
    return true;
  };
}
