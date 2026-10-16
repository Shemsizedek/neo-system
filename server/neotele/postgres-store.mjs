// NTEL-006 PostgreSQL transaction-backed enrollment.
// db.connect() must provide a pg-compatible dedicated client.
export function createNeoTelePostgresStore(db,{uuid}={}) {
 if(typeof db?.connect!=='function'||typeof uuid!=='function') throw Error('database_and_uuid_required');
 return {
  async saveEnrollment({request,subject,idempotencyKey,consentVersion}) {
   if(!request||request.memberId!==subject||!subject||!idempotencyKey||!consentVersion) throw Error('invalid_enrollment');
   const client=await db.connect();
   try {
    await client.query('BEGIN');
    const previous=await client.query('SELECT id,member_id,device_ref,status,provider_id FROM neotele.enrollment_requests WHERE member_id=$1 AND idempotency_key=$2 FOR UPDATE',[subject,idempotencyKey]);
    if(previous.rows.length){
     const row=previous.rows[0];
     if(row.device_ref!==request.deviceRef) throw Error('idempotency_key_reused_for_other_device');
     await client.query('COMMIT');
     return {memberId:row.member_id,deviceRef:row.device_ref,state:row.status,providerId:row.provider_id};
    }
    const id=uuid(), eventId=uuid();
    const inserted=await client.query('INSERT INTO neotele.enrollment_requests (id,member_id,device_ref,idempotency_key,status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (member_id,idempotency_key) DO NOTHING RETURNING id',[id,subject,request.deviceRef,idempotencyKey,'REQUESTED']);
    if(inserted.rows.length===0){
     // A concurrent request won; next retry retrieves it.
     throw Error('concurrent_enrollment_retry');
    }
    await client.query('INSERT INTO neotele.consent_events (member_id,request_id,version,action) VALUES ($1,$2,$3,$4)',[subject,id,consentVersion,'NEOTELE_REQUEST']);
    await client.query('INSERT INTO neotele.audit_outbox (id,member_id,event_type,payload) VALUES ($1,$2,$3,$4)',[eventId,subject,'NEOTELE_ENROLLMENT_REQUESTED',JSON.stringify({requestId:id,deviceRef:request.deviceRef})]);
    await client.query('COMMIT');
    return request;
   }catch(e){await client.query('ROLLBACK');throw e;}
   finally{client.release();}
  }
 };
}
