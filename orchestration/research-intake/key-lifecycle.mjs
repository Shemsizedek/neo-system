import { createPublicKey, createHash } from 'node:crypto';
import { verifyReceipt } from './receipt.mjs';
// Trusted server-side pool and authorization; principal is authenticated upstream.
export async function revokeKey(pool, authorization, principal, agentId, keyId) {
  if (!await authorization.canRevoke(principal,agentId)) return false;
  const result=await pool.query("UPDATE neo_relay.agent_keys SET revoked_at=clock_timestamp() WHERE agent_id=$1 AND key_id=$2 AND revoked_at IS NULL RETURNING key_id",[agentId,keyId]);
  return result.rows.length===1;
}
export async function completeWithActiveKey(pool, owner, receipt, signature) {
  if(typeof owner!=='string'||!receipt||receipt.owner_id!==owner) return false;
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const keys=await c.query("SELECT key_id,public_key_spki FROM neo_relay.agent_keys WHERE agent_id=$1 AND revoked_at IS NULL FOR UPDATE",[owner]);
    const tasks=await c.query("SELECT task_id,payload_hash,owner_id FROM neo_relay.tasks WHERE task_id=$1 AND owner_id=$2 AND state='CLAIMED' FOR UPDATE",[receipt.task_id,owner]);
    if(keys.rows.length!==1||tasks.rows.length!==1){await c.query('ROLLBACK');return false;}
    const k=keys.rows[0];
    if(createHash('sha256').update(k.public_key_spki).digest('hex')!==k.key_id){await c.query('ROLLBACK');return false;}
    const key=createPublicKey({key:k.public_key_spki,format:'der',type:'spki'});
    const hash=verifyReceipt(receipt,signature,key,tasks.rows[0]);
    if(!hash){await c.query('ROLLBACK');return false;}
    const result=await c.query("UPDATE neo_relay.tasks SET state='COMPLETED',receipt_hash=$3 WHERE task_id=$1 AND owner_id=$2 AND state='CLAIMED' RETURNING task_id",[receipt.task_id,owner,hash]);
    if(result.rows.length!==1){await c.query('ROLLBACK');return false;}
    await c.query('COMMIT');return true;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
