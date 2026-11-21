'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createWorkflow}=require('./workflow.cjs');
function store() {
 const rows=new Map(),keys=new Map(),audit=[];
 return {audit,async get(id){return rows.get(id)},async insert(r){const k=r.ownerId+':'+r.idempotencyKey;if(keys.has(k))return rows.get(keys.get(k));rows.set(r.id,r);keys.set(k,r.id);return r},async update(id,patch,version){const old=rows.get(id);if(!old||old.version!==version)return null;const next={...old,...patch};rows.set(id,next);return next},async appendAudit(event){audit.push(event)}};
}
test('metadata submission is idempotent and audited',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const a={id:'alice',role:'requester'};
 const first=await w.submit(a,{purpose:'General inquiry'},'unique-request-001');
 const again=await w.submit(a,{purpose:'General inquiry'},'unique-request-001');
 assert.equal(first.id,again.id);assert.equal(db.audit.length,1);
});
test('approval requires independent reviewer and valid sequence',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const alice={id:'alice',role:'requester'},bob={id:'bob',role:'reviewer'};
 const r=await w.submit(alice,{purpose:'Appointment'},'unique-request-002');
 await assert.rejects(w.transition(alice,r.id,'APPROVED',1),/invalid_transition/);
 await assert.rejects(w.transition(alice,r.id,'REVIEW_PENDING',1),/forbidden/);
 const pending=await w.transition(bob,r.id,'REVIEW_PENDING',1);
 await assert.rejects(w.transition(bob,r.id,'APPROVED',1),/version_conflict/);
 const approved=await w.transition(bob,r.id,'APPROVED',pending.version);
 assert.equal(approved.status,'APPROVED');assert.equal(db.audit.length,3);
});
test('reviewer cannot approve own request',async()=>{
 const db=store(),w=createWorkflow({store:db});
 const bob={id:'bob',role:'reviewer'},carol={id:'carol',role:'reviewer'};
 const r=await w.submit(bob,{purpose:'Meeting'},'unique-request-003');
 await assert.rejects(w.transition(bob,r.id,'REVIEW_PENDING',1),/self_review_forbidden/);
 const pending=await w.transition(carol,r.id,'REVIEW_PENDING',1);
 await assert.rejects(w.transition(bob,r.id,'APPROVED',pending.version),/self_review_forbidden/);
});
test('rejects extra sensitive metadata and invalid keys',async()=>{
 const w=createWorkflow({store:store()});
 await assert.rejects(w.submit({id:'alice',role:'requester'},{purpose:'Test',ssn:'123'},'unique-request-004'),/invalid_metadata/);
 await assert.rejects(w.submit({id:'alice',role:'requester'},{purpose:'Test'},'short'),/invalid_idempotency_key/);
});
