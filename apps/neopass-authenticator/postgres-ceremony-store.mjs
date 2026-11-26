import {createHmac} from 'node:crypto';

// Unmounted Project 144 Gate 4 storage adapter. No server, token issuance or migrations.
const ID = /^[A-Za-z0-9_-]{16,256}$/;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const KINDS = new Set(['registration', 'authentication']);
const MAX_LIFETIME_MS = 300_000;
const INSERT = [
  'INSERT INTO neopass_staging_ceremonies',
  '(binding_hash, kind, challenge, expires_at, created_at, consumed_at)',
  'VALUES ($1, $2, $3, $4, $5, NULL)',
  'ON CONFLICT (binding_hash) DO UPDATE SET',
  'kind = EXCLUDED.kind, challenge = EXCLUDED.challenge,',
  'expires_at = EXCLUDED.expires_at, created_at = EXCLUDED.created_at, consumed_at = NULL',
  'WHERE neopass_staging_ceremonies.consumed_at IS NOT NULL',
  'OR neopass_staging_ceremonies.expires_at <= EXCLUDED.created_at',
  'RETURNING binding_hash'
].join('\n');
const TAKE = [
  'UPDATE neopass_staging_ceremonies SET consumed_at = $2',
  'WHERE binding_hash = $1 AND kind = $3',
  'AND consumed_at IS NULL AND expires_at > $2',
  'RETURNING kind, challenge, expires_at'
].join('\n');
function assertRecord({subject, sessionKey, kind}) {
  if (typeof subject !== 'string' || !subject || subject.length > 256 ||
      !ID.test(sessionKey ?? '') || !KINDS.has(kind)) {
    throw Error('invalid_ceremony_scope');
  }
}
function binding(key, origin, rpId, {subject, sessionKey, kind}) {
  const values=[origin,rpId,subject,sessionKey,kind];
  const payload=values.map(value=>String(Buffer.byteLength(value,'utf8'))+':'+value).join('|');
  return createHmac('sha256',key).update(payload).digest('hex');
}
export function createPostgresCeremonyStore({pool,hmacKey,rpId,origin,now=()=>Date.now()}={}) {
  if (typeof pool?.query !== 'function' ||
      !Buffer.isBuffer(hmacKey) || hmacKey.length < 32 ||
      typeof rpId !== 'string' || !/^[a-z0-9.-]+$/.test(rpId) ||
      origin !== 'https://' + rpId || typeof now !== 'function') {
    throw Error('postgres_ceremony_configuration_required');
  }
  return Object.freeze({
    async put(scope) {
      assertRecord(scope);
      const {kind,challenge,expiresAt}=scope;
      const t=now();
      if (!Number.isSafeInteger(t) || !CHALLENGE.test(challenge ?? '') ||
          !Number.isSafeInteger(expiresAt) || expiresAt <= t ||
          expiresAt > t + MAX_LIFETIME_MS) throw Error('invalid_ceremony_challenge');
      const id=binding(hmacKey,origin,rpId,scope);
      const result=await pool.query(INSERT,[id,kind,challenge,new Date(expiresAt),new Date(t)]);
      if (result.rowCount!==1) throw Error('ceremony_already_pending');
      return true;
    },
    async take(scope) {
      assertRecord(scope);
      const t=now();
      if (!Number.isSafeInteger(t)) throw Error('invalid_clock');
      const id=binding(hmacKey,origin,rpId,scope);
      // Atomic UPDATE...RETURNING: no separate SELECT/UPDATE replay window.
      const result=await pool.query(TAKE,[id,new Date(t),scope.kind]);
      if (result.rowCount!==1) return null;
      const row=result.rows?.[0];
      const expiresAt=row?.expires_at instanceof Date ?
        row.expires_at.getTime() : new Date(row?.expires_at).getTime();
      if (row?.kind!==scope.kind || !CHALLENGE.test(row?.challenge ?? '') ||
          !Number.isSafeInteger(expiresAt) || expiresAt<=t) return null;
      return Object.freeze({subject:scope.subject,sessionKey:scope.sessionKey,
        kind:scope.kind,challenge:row.challenge,expiresAt});
    }
  });
}
export const SQL_STATEMENTS=Object.freeze({INSERT,TAKE});
