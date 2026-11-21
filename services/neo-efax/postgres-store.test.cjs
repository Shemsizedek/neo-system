'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createPostgresStore}=require('./postgres-store.cjs');
function mockPool({failAudit=false}={}){
 const queries=[],client={async query(sql,vals=[]){queries.push({sql,vals});
  if(failAudit&&sql.includes('INSERT INTO neo_efax_audit'))throw new Error('audit_down');
  if(sql.includes('INSERT INTO neo_efax_requests'))return {rows:[{id:vals[0],tenant_id:vals[1],owner_id:vals[2],purpose:vals[3],status:vals[4],idempotency_key:vals[5],created_at:vals[6],version:vals[7]}]};
  return {rows:[]};},release(){queries.push({sql:'RELEASE'})}};
 return {queries,async connect(){return client}};
}
const record={id:'14e0410e-cc2b-4949-a355-4cc54259e6d3',tenantId:'t1',ownerId:'a1',purpose:'Test',status:'SUBMITTED',idempotencyKey:'example-key-0001',createdAt:'2026-11-20T00:00:00Z',version:1};
test('transaction commits audit with metadata',async()=>{
 const pool=mockPool(),s=createPostgresStore(pool);
 const r=await s.transaction(async tx=>{const x=await tx.insert(record);await tx.appendAudit({tenantId:'t1',requestId:x.id,actorId:'a1',action:'SUBMITTED',at:record.createdAt});return x});
 assert.equal(r.tenantId,'t1');assert.deepEqual(pool.queries.map(q=>q.sql.trim().split(/\s+/).slice(0,3).join(' ')),['BEGIN','INSERT INTO neo_efax_requests','INSERT INTO neo_efax_audit','COMMIT','RELEASE']);
});
test('failed audit triggers ROLLBACK',async()=>{
 const pool=mockPool({failAudit:true}),s=createPostgresStore(pool);
 await assert.rejects(s.transaction(async tx=>{await tx.insert(record);await tx.appendAudit({tenantId:'t1',requestId:record.id,actorId:'a1',action:'SUBMITTED',at:record.createdAt})}),/audit_down/);
 assert.ok(pool.queries.some(q=>q.sql==='ROLLBACK'));assert.ok(!pool.queries.some(q=>q.sql==='COMMIT'));
});
test('read and update constrain tenant',async()=>{
 const pool=mockPool(),s=createPostgresStore(pool);
 await s.transaction(async tx=>{await tx.get('tenant','id');await tx.update('tenant','id',{status:'APPROVED',version:2},1)});
 assert.ok(pool.queries[1].sql.includes('WHERE tenant_id=$1 AND id=$2 FOR UPDATE'));
 assert.ok(pool.queries[2].sql.includes('WHERE tenant_id=$1 AND id=$2 AND version=$5'));
});
