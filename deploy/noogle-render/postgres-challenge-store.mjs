// Parameterized PostgreSQL adapter; no network connection constructed here.
export function createPostgresChallengeStore(db) {
 if(!db || typeof db.query!=='function')throw Error('database_required');
 return Object.freeze({
  async insert(record) {
   await db.query(
    'INSERT INTO noogle_connect_challenges(challenge_hash,subject_id,credential_id,purpose,rp_id,origin,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
    [record.challengeHash,record.subject,record.credentialId,record.purpose,record.rpId,record.origin,record.expiresAt]);
  },
  async consumeAtomic(p) {
   const result=await db.query(
    'UPDATE noogle_connect_challenges SET consumed_at=$8 WHERE challenge_hash=$1 AND subject_id=$2 AND credential_id IS NOT DISTINCT FROM $3 AND purpose=$4 AND rp_id=$5 AND origin=$6 AND expires_at>$7 AND consumed_at IS NULL RETURNING challenge_hash',
    [p.challengeHash,p.subject,p.credentialId,p.purpose,p.rpId,p.origin,p.now,p.now]);
   return result.rows.length===1;
  }
 });
}
