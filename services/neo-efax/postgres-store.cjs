'use strict';
// Inject a pg-compatible Pool. No network or credentials here.
function fromRow(r){return r&&{id:r.id,tenantId:r.tenant_id,ownerId:r.owner_id,purpose:r.purpose,status:r.status,idempotencyKey:r.idempotency_key,createdAt:r.created_at,version:r.version};}
const FIELDS='id, tenant_id, owner_id, purpose, status, idempotency_key, created_at, version';
function createPostgresStore(pool){
 if(!pool||typeof pool.connect!=='function')throw new Error('pg_pool_required');
 return {async transaction(work){
  if(typeof work!=='function')throw new Error('transaction_callback_required');
  const client=await pool.connect();let begun=false;
  try{
   await client.query('BEGIN');begun=true;
   const tx={
    async get(tenantId,id){
     const r=await client.query('SELECT '+FIELDS+' FROM neo_efax_requests WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[tenantId,id]);
     return fromRow(r.rows[0]);
    },
    async insert(record){
     const vals=[record.id,record.tenantId,record.ownerId,record.purpose,record.status,record.idempotencyKey,record.createdAt,record.version];
     const inserted=await client.query('INSERT INTO neo_efax_requests ('+FIELDS+') VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (tenant_id,owner_id,idempotency_key) DO NOTHING RETURNING '+FIELDS,vals);
     if(inserted.rows[0])return fromRow(inserted.rows[0]);
     const prior=await client.query('SELECT '+FIELDS+' FROM neo_efax_requests WHERE tenant_id=$1 AND owner_id=$2 AND idempotency_key=$3 FOR UPDATE',[record.tenantId,record.ownerId,record.idempotencyKey]);
     const existing=fromRow(prior.rows[0]);
     if(!existing)throw new Error('idempotency_conflict_not_found');
     if(existing.purpose!==record.purpose)throw new Error('idempotency_payload_conflict');
     return existing;
    },
    async update(tenantId,id,patch,expectedVersion){
     const result=await client.query('UPDATE neo_efax_requests SET status=$3,version=$4 WHERE tenant_id=$1 AND id=$2 AND version=$5 RETURNING '+FIELDS,[tenantId,id,patch.status,patch.version,expectedVersion]);
     return fromRow(result.rows[0]);
    },
    async appendAudit(event){
     await client.query('INSERT INTO neo_efax_audit (tenant_id,request_id,actor_id,action,occurred_at) VALUES ($1,$2,$3,$4,$5)',[event.tenantId,event.requestId,event.actorId,event.action,event.at]);
    }
   };
   const result=await work(tx);await client.query('COMMIT');begun=false;return result;
  }catch(err){if(begun){try{await client.query('ROLLBACK')}catch(rollbackErr){err.rollbackError=rollbackErr}}throw err}
  finally{client.release()}
 }};
}
module.exports={createPostgresStore};
