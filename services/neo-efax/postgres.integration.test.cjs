'use strict';
// Explicit opt-in only: never connect to production or a DB with a non-test name.
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {createWorkflow}=require('./workflow.cjs');
const {createPostgresStore}=require('./postgres-store.cjs');

const connectionString=process.env.NEO_EFAX_TEST_DATABASE_URL;
if (!connectionString) {
  test('PostgreSQL integration (requires isolated neo_efax_test DB)', {skip:'NEO_EFAX_TEST_DATABASE_URL not configured'},()=>{});
} else {
  const url=new URL(connectionString);
  const database=decodeURIComponent(url.pathname.replace(/^\//,''));
  if (!['postgres:','postgresql:'].includes(url.protocol) || !/^neo_efax_test(?:_[a-z0-9]+)?$/.test(database)) {
    throw new Error('refusing_non_test_database');
  }
  // The pg driver must be provided explicitly in the isolated test environment;
  // never add implicit production credential resolution.
  const {Pool}=require('pg');
  const schema='efax_it_'+crypto.randomBytes(6).toString('hex');
  const pool=new Pool({connectionString,max:4,options:'-c search_path='+schema+',public',connectionTimeoutMillis:5000});
  const store=createPostgresStore(pool);
  const random=()=>crypto.randomUUID();
  const actor={id:'requester_'+random(),tenantId:'TENANT_ONE',role:'requester'};
  const reviewer={id:'reviewer_'+random(),tenantId:actor.tenantId,role:'reviewer'};
  const w=createWorkflow({store});
  let ready=false;

  test.before(async()=>{
    // Isolated, randomized schema, owned entirely by this test run.
    const c=await pool.connect();
    try {
      await c.query('CREATE SCHEMA '+schema);
      await c.query(fs.readFileSync(path.join(__dirname,'001-metadata.sql'),'utf8'));
      ready=true;
    } finally {c.release();}
  });
  test.after(async()=>{
    try {if(ready)await pool.query('DROP SCHEMA '+schema+' CASCADE');}
    finally {await pool.end();}
  });
  test('migration + submit + one idempotent audit row',async()=>{
    const key='key_'+random().replace(/-/g,'');
    const first=await w.submit(actor,{purpose:'safe fixture'},key);
    const again=await w.submit(actor,{purpose:'safe fixture'},key);
    assert.equal(first.id,again.id);
    const rows=await pool.query('SELECT action FROM neo_efax_audit WHERE tenant_id=$1 AND request_id=$2',[actor.tenantId,first.id]);
    assert.deepEqual(rows.rows.map(r=>r.action),['SUBMITTED']);
    await assert.rejects(w.submit(actor,{purpose:'different payload'},key),/idempotency_payload_conflict/);
  });
  test('tenant scoping, independent reviewer, and atomic state change',async()=>{
    const r=await w.submit(actor,{purpose:'tenant test'},'key_'+random().replace(/-/g,''));
    await assert.rejects(w.transition({...reviewer,tenantId:'TENANT_TWO'},r.id,'REVIEW_PENDING',1),/not_found/);
    await assert.rejects(w.transition({...reviewer,id:actor.id},r.id,'REVIEW_PENDING',1),/self_review_forbidden/);
    const pending=await w.transition(reviewer,r.id,'REVIEW_PENDING',1);
    assert.equal(pending.version,2);
    const approved=await w.transition(reviewer,r.id,'APPROVED',2);
    assert.equal(approved.status,'APPROVED');
    const audits=await pool.query('SELECT action FROM neo_efax_audit WHERE tenant_id=$1 AND request_id=$2 ORDER BY event_id',[actor.tenantId,r.id]);
    assert.deepEqual(audits.rows.map(x=>x.action),['SUBMITTED','REVIEW_PENDING','APPROVED']);
  });
  test('two concurrent approval attempts produce one winner',async()=>{
    const r=await w.submit(actor,{purpose:'concurrent test'},'key_'+random().replace(/-/g,''));
    await w.transition(reviewer,r.id,'REVIEW_PENDING',1);
    const reviewer2={...reviewer,id:'reviewer2_'+random()};
    const results=await Promise.allSettled([
      w.transition(reviewer,r.id,'APPROVED',2),w.transition(reviewer2,r.id,'REJECTED',2)
    ]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(results.filter(x=>x.status==='rejected'&&/version_conflict/.test(x.reason?.message)).length,1);
    const audits=await pool.query("SELECT count(*)::int AS n FROM neo_efax_audit WHERE request_id=$1 AND action IN ('APPROVED','REJECTED')",[r.id]);
    assert.equal(audits.rows[0].n,1);
  });
  test('SQL validation failure rolls back metadata insert',async()=>{
    const id=random();
    const data={id,tenantId:actor.tenantId,ownerId:actor.id,purpose:'rollback fixture',status:'SUBMITTED',idempotencyKey:'key_'+random().replace(/-/g,''),createdAt:new Date().toISOString(),version:1};
    await assert.rejects(store.transaction(async tx=>{
      await tx.insert(data);
      await tx.appendAudit({tenantId:data.tenantId,requestId:id,actorId:actor.id,action:'INVALID_ACTION',at:data.createdAt});
    }));
    const rows=await pool.query('SELECT id FROM neo_efax_requests WHERE id=$1',[id]);
    assert.equal(rows.rowCount,0);
  });
}
