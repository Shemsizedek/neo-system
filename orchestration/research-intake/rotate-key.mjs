import { validateEnrollment } from './enrollment.mjs';
// Trusted principal and authorization adapter; challenge must be approved for rotation.
export async function rotateKey(pool, authorization, principal, nonce, oldKeyId, spki, signature) {
  if(typeof nonce!=='string'||!/^[a-f0-9]{64}$/.test(nonce)||typeof oldKeyId!=='string'||!/^[a-f0-9]{64}$/.test(oldKeyId)) return false;
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const q=await c.query("SELECT agent_id,nonce,expires_at_ms,approved_by FROM neo_relay.enrollment_challenges WHERE nonce=$1 AND consumed_at IS NULL FOR UPDATE",[nonce]);
    const r=q.rows[0];
    if(q.rows.length!==1||r.approved_by!==principal.id||!await authorization.canRotate(principal,r.agent_id,oldKeyId)){await c.query('ROLLBACK');return false;}
    const proof=validateEnrollment({agentId:r.agent_id,nonce:r.nonce,expiresAt:Number(r.expires_at_ms)},spki,signature);
    if(!proof||proof.keyId===oldKeyId){await c.query('ROLLBACK');return false;}
    const revoked=await c.query("UPDATE neo_relay.agent_keys SET revoked_at=clock_timestamp() WHERE agent_id=$1 AND key_id=$2 AND revoked_at IS NULL RETURNING key_id",[r.agent_id,oldKeyId]);
    if(revoked.rows.length!==1){await c.query('ROLLBACK');return false;}
    const used=await c.query("UPDATE neo_relay.enrollment_challenges SET consumed_at=clock_timestamp() WHERE nonce=$1 AND consumed_at IS NULL AND expires_at_ms > extract(epoch FROM clock_timestamp())*1000 RETURNING nonce",[nonce]);
    if(used.rows.length!==1){await c.query('ROLLBACK');return false;}
    await c.query("INSERT INTO neo_relay.agent_keys(agent_id,key_id,public_key_spki) VALUES ($1,$2,$3)",[r.agent_id,proof.keyId,spki]);
    await c.query('COMMIT');return proof;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
