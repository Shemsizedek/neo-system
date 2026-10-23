import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoTelePostgresStore} from './postgres-store.mjs';
test('writes enrollment consent and audit in one transaction',async()=>{
 const sql=[];const client={query:async(q)=>{sql.push(q);return {rows:q.startsWith('SELECT')?[]:q.startsWith('INSERT INTO neotele.enrollment_requests')?[{id:'req'}]:[]};},release:()=>{}};
 const store=createNeoTelePostgresStore({connect:async()=>client},{uuid:()=> 'id'});
 await store.saveEnrollment({request:{memberId:'chaplain-1',deviceRef:'device-1',state:'REQUESTED'},subject:'chaplain-1',idempotencyKey:'key1',consentVersion:'v1'});
 assert.equal(sql[0],'BEGIN');assert.equal(sql.at(-1),'COMMIT');
 assert.equal(sql.filter(s=>s.startsWith('INSERT')).length,3);
});
test('reused key for another device rolls back',async()=>{
 const sql=[];const client={query:async(q)=>{sql.push(q);return {rows:q.startsWith('SELECT')?[{id:'old',member_id:'chaplain-1',device_ref:'different',status:'REQUESTED',provider_id:null}]:[]};},release:()=>{}};
 const store=createNeoTelePostgresStore({connect:async()=>client},{uuid:()=> 'id'});
 await assert.rejects(()=>store.saveEnrollment({request:{memberId:'chaplain-1',deviceRef:'device-1'},subject:'chaplain-1',idempotencyKey:'key',consentVersion:'v1'}),/idempotency_key_reused/);
 assert.equal(sql.at(-1),'ROLLBACK');
});
