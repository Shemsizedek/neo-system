// Injectable only; never mounted on public staging HTTP.
// The pool must be an authenticated server-side pg Pool.
export function createPostgresDeviceStore(pool) {
 if(!pool || typeof pool.query!=='function' || typeof pool.connect!=='function')throw Error('transactional_database_required');
 return Object.freeze({
  async list(subject) {
   const result=await pool.query('SELECT id,type,label,created_at AS "createdAt",revoked_at AS "revokedAt" FROM noogle_connect_devices WHERE subject=$1 ORDER BY created_at DESC LIMIT 100',[subject]);
   return result.rows;
  },
  async enrollAtomically({record,challenge}) {
   if(typeof challenge!=='string' || !challenge)throw Error('challenge_required');
   const client=await pool.connect();let began=false;
   try {
    await client.query('BEGIN');began=true;
    const result=await client.query('UPDATE noogle_connect_enrollment_challenges SET consumed_at=NOW() WHERE challenge_id=$1 AND subject=$2 AND public_key_hash=$3 AND consumed_at IS NULL AND expires_at>NOW() RETURNING challenge_id',[challenge,record.subject,record.publicKeyHash]);
    if(result.rowCount!==1)throw Error('challenge_invalid_or_replayed');
    await client.query('INSERT INTO noogle_connect_devices(id,subject,type,label,public_key_hash,created_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,NULL)',[record.id,record.subject,record.type,record.label,record.publicKeyHash,record.createdAt]);
    await client.query('COMMIT');began=false;
   } catch(error){if(began)await client.query('ROLLBACK');throw error;}
   finally{client.release();}
  },
  async revokeIfOwned(subject,id,now){
   const result=await pool.query('UPDATE noogle_connect_devices SET revoked_at=$3 WHERE subject=$1 AND id=$2 AND revoked_at IS NULL RETURNING id',[subject,id,now]);
   return result.rowCount===1;
  }
 });
}
