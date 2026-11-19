// Staging-only issued-session allowlist with explicit revocation. Does not
// mount a route, open a database connection, or store bearer tokens/keys.
const validJti = v => typeof v==='string' && /^[A-Za-z0-9_-]{32,128}$/.test(v);
const validSubject = v => typeof v==='string' && v.length>=3 && v.length<=256;
const int = v => Number.isSafeInteger(v) && v>=0;

export function createPostgresNeoKeySessionStore(pool) {
  if(typeof pool?.query!=='function')throw Error('neo_key_session_store_configuration_required');
  return Object.freeze({
    async registerSession({subject,jti,iat,exp}={}) {
      if(!validSubject(subject)||!validJti(jti)||!int(iat)||!int(exp)||
         exp<=iat||exp>iat+300) return false;
      const r=await pool.query(`INSERT INTO neo_key_staging_sessions
        (jti,subject_id,issued_at,expires_at) VALUES($1,$2,$3,$4)
        ON CONFLICT (jti) DO NOTHING RETURNING jti`,[jti,subject,iat,exp]);
      return r.rows.length===1;
    },
    async isSessionActive({subject,jti,now}={}) {
      if(!validSubject(subject)||!validJti(jti)||!int(now))return false;
      const r=await pool.query(`SELECT 1 FROM neo_key_staging_sessions
        WHERE jti=$1 AND subject_id=$2 AND expires_at>$3
          AND issued_at<=$3 AND revoked_at IS NULL`,[jti,subject,now]);
      return r.rows.length===1;
    },
    async revokeSession({subject,jti,now}={}) {
      if(!validSubject(subject)||!validJti(jti)||!int(now))return false;
      const r=await pool.query(`UPDATE neo_key_staging_sessions SET revoked_at=$3
        WHERE jti=$1 AND subject_id=$2 AND revoked_at IS NULL
        RETURNING jti`,[jti,subject,now]);
      return r.rows.length===1;
    },
    async revokeSubjectSessions({subject,now}={}) {
      if(!validSubject(subject)||!int(now))return false;
      const r=await pool.query(`UPDATE neo_key_staging_sessions SET revoked_at=$2
        WHERE subject_id=$1 AND revoked_at IS NULL RETURNING jti`,[subject,now]);
      return r.rows.length;
    }
  });
}
