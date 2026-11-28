import { validateEnrollment } from './enrollment.mjs';
// pool and authorization are trusted server-side dependencies.
export async function enrollAgent(pool, authorization, principal, nonce, spki, signature) {
  if (!/^[a-f0-9]{64}$/.test(nonce) || !await authorization.canEnroll(principal)) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows} = await client.query("SELECT agent_id,nonce,expires_at_ms,approved_by FROM neo_relay.enrollment_challenges WHERE nonce=$1 AND consumed_at IS NULL FOR UPDATE",[nonce]);
    if (rows.length !== 1 || rows[0].approved_by !== principal.id) { await client.query('ROLLBACK'); return false; }
    const row=rows[0];
    const result=validateEnrollment({agentId:row.agent_id,nonce:row.nonce,expiresAt:Number(row.expires_at_ms)},spki,signature);
    if (!result) { await client.query('ROLLBACK'); return false; }
    const consumed=await client.query("UPDATE neo_relay.enrollment_challenges SET consumed_at=clock_timestamp() WHERE nonce=$1 AND consumed_at IS NULL AND expires_at_ms > extract(epoch FROM clock_timestamp())*1000 RETURNING nonce",[nonce]);
    if(consumed.rows.length!==1) { await client.query('ROLLBACK'); return false; }
    await client.query("INSERT INTO neo_relay.agent_keys(agent_id,key_id,public_key_spki) VALUES ($1,$2,$3)",[result.agentId,result.keyId,spki]);
    await client.query('COMMIT');
    return result;
  } catch(error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
