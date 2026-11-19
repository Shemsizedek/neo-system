// Server-only PostgreSQL persistence for NEO Key assertion proofs.
// Same DB transaction consumes the challenge and confirms the sign counter.
// This adapter never connects by itself or mounts a public route.
export function createPostgresNeoKeyAssertionStore(pool) {
  if(typeof pool?.query!=='function'||typeof pool?.connect!=='function') {
    throw Error('neo_key_assertion_postgres_required');
  }
  const transaction=async work=>{
    const db=await pool.connect();
    let begun=false;
    try {
      await db.query('BEGIN');begun=true;
      const result=await work(db);
      await db.query('COMMIT');begun=false;return result;
    }catch(e){if(begun)await db.query('ROLLBACK');throw e;}
    finally{db.release();}
  };
  return Object.freeze({
    async getActiveCredential(id) {
      const result=await pool.query(`SELECT credential_id,subject_id,rp_id,public_key_cose,
        sign_count,revoked_at FROM neo_key_credentials
        WHERE credential_id=$1 AND revoked_at IS NULL`,[id]);
      const row=result.rows[0];
      if(!row)return null;
      const signCount=Number(row.sign_count);
      if(!Number.isSafeInteger(signCount)||signCount<0)return null;
      return {credentialId:row.credential_id,subject:row.subject_id,rpId:row.rp_id,
        publicKeyCose:row.public_key_cose,signCount,revokedAt:row.revoked_at};
    },
    async insertAuthenticationChallenge(p) {
      await pool.query(`INSERT INTO neo_key_authentication_challenges
        (challenge_hash,subject_id,credential_id,rp_id,origin,expires_at)
        VALUES($1,$2,$3,$4,$5,$6)`,
        [p.challengeHash,p.subject,p.credentialId,p.rpId,p.origin,p.expiresAt]);
    },
    async getPendingAuthenticationChallenge(p) {
      const r=await pool.query(`SELECT challenge_hash FROM neo_key_authentication_challenges
        WHERE challenge_hash=$1 AND subject_id=$2 AND credential_id=$3
        AND rp_id=$4 AND origin=$5 AND expires_at>$6 AND consumed_at IS NULL`,
        [p.challengeHash,p.subject,p.credentialId,p.rpId,p.origin,p.now]);
      return r.rows.length===1;
    },
    async confirmAuthenticationAtomic(p) {
      if(!Number.isSafeInteger(p.newCounter)||p.newCounter<0)return false;
      return transaction(async db=>{
        // Owner-wide advisory lock serializes authentication, revocation,
        // and registration even across multiple workers.
        await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text,0))',[p.subject]);
        const active=await db.query(`SELECT sign_count FROM neo_key_credentials
          WHERE credential_id=$1 AND subject_id=$2 AND rp_id=$3
          AND revoked_at IS NULL FOR UPDATE`,[p.credentialId,p.subject,p.rpId]);
        if(active.rows.length!==1)return false;
        const prior=Number(active.rows[0].sign_count);
        if(!Number.isSafeInteger(prior)||prior<0||
           !(p.newCounter===0&&prior===0 || p.newCounter>prior))return false;
        const consumed=await db.query(`UPDATE neo_key_authentication_challenges
          SET consumed_at=$7
          WHERE challenge_hash=$1 AND subject_id=$2 AND credential_id=$3
          AND rp_id=$4 AND origin=$5 AND expires_at>$6 AND consumed_at IS NULL
          RETURNING challenge_hash`,
          [p.challengeHash,p.subject,p.credentialId,p.rpId,p.origin,p.now,p.now]);
        if(consumed.rows.length!==1)return false;
        const updated=await db.query(`UPDATE neo_key_credentials SET sign_count=$4
          WHERE credential_id=$1 AND subject_id=$2 AND rp_id=$3
            AND sign_count=$5 AND revoked_at IS NULL
          RETURNING credential_id`,
          [p.credentialId,p.subject,p.rpId,p.newCounter,prior]);
        if(updated.rows.length!==1)throw Error('neo_key_counter_update_race');
        return true;
      });
    }
  });
}
