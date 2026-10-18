import {makeAuditEvent} from './audit.mjs';
export function createPostgresHistoryStore(pool){
 if(!pool?.connect)throw new Error('PostgreSQL pool required');
 return {
  async append(event){
   const client=await pool.connect();
   try{
    await client.query('BEGIN');
    // Serialize writes per asset to prevent hash-chain forks between workers.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[event.assetId]);
    const previous=await client.query('SELECT event_hash FROM bmi_evidence_audit WHERE asset_id=$1 ORDER BY id DESC LIMIT 1',[event.assetId]);
    const chained=makeAuditEvent({...event,previousHash:previous.rows[0]?.event_hash||null});
    await client.query('INSERT INTO bmi_evidence_audit(operator_id,asset_id,bitcoin_txid,status,block_hash,evidence_json,previous_hash,event_hash,occurred_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)',[chained.operatorId,chained.assetId,chained.txid,chained.status,chained.blockHash,JSON.stringify(chained.evidence),chained.previousHash,chained.eventHash,chained.occurredAt]);
    await client.query('COMMIT');
    return chained;
   }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  },
  async list({assetId,txid,limit=50}){
   const result=await pool.query('SELECT occurred_at,status,block_hash,event_hash,previous_hash,evidence_json FROM bmi_evidence_audit WHERE asset_id=$1 AND bitcoin_txid=$2 ORDER BY id DESC LIMIT $3',[assetId,txid,Math.min(limit,50)]);
   return result.rows;
  }
 };
}
