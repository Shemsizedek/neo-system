import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTeleEvidenceApprovalStore} from './evidence-approval-store.mjs';
function store({record={reference:'ref1',submitter:'author',status:'PENDING_REVIEW',revision:1,digest:'sha256:abc'},changed=true}={}){
 const queries=[];
 const client={query:async(sql)=>{queries.push(sql);if(sql.startsWith('SELECT'))return {rows:record?[record]:[]};if(sql.startsWith('UPDATE'))return {rows:changed?[{status:'APPROVED',reviewed_at:'2026-10-16'}]:[]};return {rows:[]}},release(){}};
 return {queries,run:createNeoTeleEvidenceApprovalStore({db:{connect:async()=>client},uuid:()=> '00000000-0000-4000-8000-000000000001'})};
}
const args={reference:'ref1',decision:'APPROVED',reviewer:'reviewer',approvalId:'guardian-1',reviewEvidence:{independentlyVerified:true}};
test('atomic approval emits audit and outbox before commit',async()=>{
 const {queries,run}=store();await run(args);
 assert.equal(queries[0],'BEGIN');assert.equal(queries.at(-1),'COMMIT');
 assert.equal(queries.filter(x=>x.startsWith('INSERT')).length,2);
});
test('submitter cannot approve their own evidence',async()=>{
 const {queries,run}=store();await assert.rejects(()=>run({...args,reviewer:'author'}),/review_not_permitted/);
 assert.equal(queries.at(-1),'ROLLBACK');
});
test('optimistic revision conflict rolls back transaction',async()=>{
 const {queries,run}=store({changed:false});await assert.rejects(()=>run(args),/evidence_revision_conflict/);
 assert.equal(queries.at(-1),'ROLLBACK');
});
