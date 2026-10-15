// Inactive transaction boundary; use dedicated DB connection per transaction.
// Proof is consumed by trusted in-process gate; server must recover if commit fails.
export function createAtomicEnrollment({pool,proofConsumer}) {
 if(!pool?.connect || typeof proofConsumer?.consume!=='function')throw Error('transaction_dependencies_required');
 return async function enroll({subject,proof,challengeHash,rpId,origin,id,type,label,publicKeyHash,now}) {
  if(typeof subject!=='string'||!subject||typeof challengeHash!=='string'||!challengeHash ||
    !['android','chromebook'].includes(type)||typeof id!=='string'||!id ||
    typeof label!=='string'||!label||!publicKeyHash)throw Error('invalid_enrollment_request');
  // A consumed in-memory proof cannot be replayed if a transaction fails.
  // Recovery requires a new verified ceremony; no retry with the old proof.
  const checked=proofConsumer.consume(proof,subject);
  if(!checked?.credentialId||!checked?.publicKey)throw Error('verified_proof_required');
  const client=await pool.connect();
  try {
   await client.query('BEGIN');
   const consume=await client.query(
    "UPDATE noogle_connect_challenges SET consumed_at=$5 WHERE challenge_hash=$1 AND subject_id=$2 AND purpose='register' AND credential_id IS NULL AND rp_id=$3 AND origin=$4 AND expires_at>$5 AND consumed_at IS NULL RETURNING subject_id",
    [challengeHash,subject,rpId,origin,now]);
   if(consume.rows.length!==1)throw Error('challenge_invalid_or_replayed');
   const inserted=await client.query(
    'INSERT INTO noogle_connect_devices(id,subject_id,type,label,public_key_hash,created_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,NULL) RETURNING id',
    [id,subject,type,label,publicKeyHash,now]);
   if(inserted.rows.length!==1)throw Error('device_insert_failed');
   await client.query('COMMIT');
   return {id,registered:true,permissions:[]};
  }catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
 };
}
