'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createWorkflow}=require('./workflow.cjs');
function store(){
 let rows=new Map(),keys=new Map(),audit=[];let failAudit=false;
 return {
  get audit(){return audit},get rows(){return rows},set failAudit(x){failAudit=x},
  async transaction(work){
   const nextRows=new Map(rows),nextKeys=new Map(keys),nextAudit=[...audit];
   const tx={
    async get(tenant,id){const r=nextRows.get(id);return r&&r.tenantId===tenant?r:null},
    async insert(r){const k=r.tenantId+':'+r.ownerId+':'+r.idempotencyKey;
     if(nextKeys.has(k)){const old=nextRows.get(nextKeys.get(k));if(old.purpose!==r.purpose)throw new Error('idempotency_payload_conflict');return old;}
     nextRows.set(r.id,r);nextKeys.set(k,r.id);return r;},
    async update(tenant,id,patch,version){const old=nextRows.get(id);
     if(!old||old.tenantId!==tenant||old.version!==version)return null;
     const updated={...old,...patch};nextRows.set(id,updated);return updated;},
    async appendAudit(event){if(failAudit)throw new Error('audit_down');nextAudit.push(event)}
   };
   const result=await work(tx);rows=nextRows;keys=nextKeys;audit=nextAudit;return result;
  }
 };
}
const alice={id:'alice',tenantId:'NEO',role:'requester'},bob={id:'bob',tenantId:'NEO',role:'reviewer'};
test('submission idempotent with one audit record',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const r=await w.submit(alice,{purpose:'General'},'unique-request-001');
 const again=await w.submit(alice,{purpose:'General'},'unique-request-001');
 assert.equal(r.id,again.id);assert.equal(db.audit.length,1);
 await assert.rejects(w.submit(alice,{purpose:'Changed'},'unique-request-001'),/idempotency_payload_conflict/);
});
test('approval has version checks and independent reviewer',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const r=await w.submit(alice,{purpose:'Appointment'},'unique-request-002');
 await assert.rejects(w.transition(alice,r.id,'APPROVED',1),/forbidden/);
 await assert.rejects(w.transition(alice,r.id,'REVIEW_PENDING',1),/forbidden/);
 const pending=await w.transition(bob,r.id,'REVIEW_PENDING',1);
 await assert.rejects(w.transition(bob,r.id,'APPROVED',1),/version_conflict/);
 const approved=await w.transition(bob,r.id,'APPROVED',pending.version);
 assert.equal(approved.status,'APPROVED');assert.equal(db.audit.length,3);
});
test('reviewer cannot approve their own request',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const carol={id:'carol',tenantId:'NEO',role:'reviewer'};
 const r=await w.submit(bob,{purpose:'Meeting'},'unique-request-003');
 await assert.rejects(w.transition(bob,r.id,'REVIEW_PENDING',1),/self_review_forbidden/);
 const pending=await w.transition(carol,r.id,'REVIEW_PENDING',1);
 await assert.rejects(w.transition(bob,r.id,'APPROVED',pending.version),/self_review_forbidden/);
});
test('rejects sensitive metadata and untrusted actors',async()=>{
 const w=createWorkflow({store:store()});
 await assert.rejects(w.submit(alice,{purpose:'Test',ssn:'123'},'unique-request-004'),/invalid_metadata/);
 await assert.rejects(w.submit(alice,{purpose:'Test'},'short'),/invalid_idempotency_key/);
 await assert.rejects(w.submit({id:'a',role:'requester'},{purpose:'Test'},'unique-request-004'),/unauthorized_actor/);
});
test('cross-tenant actor cannot review',async()=>{
 const w=createWorkflow({store:store()});
 const r=await w.submit(alice,{purpose:'Test'},'unique-request-005');
 await assert.rejects(w.transition({...bob,tenantId:'OTHER'},r.id,'REVIEW_PENDING',1),/not_found/);
});
test('audit failure rolls back metadata and status',async()=>{
 const db=store(),w=createWorkflow({store:db});
 db.failAudit=true;
 await assert.rejects(w.submit(alice,{purpose:'Test'},'unique-request-006'),/audit_down/);
 assert.equal(db.rows.size,0);
 db.failAudit=false;
 const r=await w.submit(alice,{purpose:'Test'},'unique-request-006');
 db.failAudit=true;
 await assert.rejects(w.transition(bob,r.id,'REVIEW_PENDING',1),/audit_down/);
 assert.equal(db.rows.get(r.id).status,'SUBMITTED');assert.equal(db.audit.length,1);
});
