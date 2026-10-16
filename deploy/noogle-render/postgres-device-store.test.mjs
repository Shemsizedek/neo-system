import assert from 'node:assert/strict';
import test from 'node:test';
import {createPostgresDeviceStore} from './postgres-device-store.mjs';

const record={id:'00000000-0000-4000-8000-000000000001',subject:'owner-a',type:'android',label:'Phone',publicKeyHash:'k'.repeat(64),createdAt:1000};
function fixture({consume=1,insertFails=false}={}){
 const calls=[];let releases=0;
 const client={async query(sql,args=[]){calls.push({sql,args});if(sql.startsWith('UPDATE noogle_connect_enrollment_challenges'))return {rowCount:consume};if(sql.startsWith('INSERT')&&insertFails)throw Error('insert_failure');return {rowCount:1};},release(){releases++;}};
 const pool={async connect(){return client;},async query(sql,args){calls.push({sql,args});return {rowCount:1,rows:[]};}};
 return {store:createPostgresDeviceStore(pool),calls,releases:()=>releases};
}
test('successful enrollment consumes challenge and inserts in same transaction',async()=>{
 const f=fixture();await f.store.enrollAtomically({record,challenge:'challenge-a'});
 assert.deepEqual(f.calls.map(c=>c.sql.split(' ')[0]),['BEGIN','UPDATE','INSERT','COMMIT']);
 assert.deepEqual(f.calls[1].args,['challenge-a','owner-a',record.publicKeyHash]);
 assert.equal(f.releases(),1);
});
test('replayed or expired challenge denies enrollment and rolls back',async()=>{
 const f=fixture({consume:0});
 await assert.rejects(()=>f.store.enrollAtomically({record,challenge:'used'}),/challenge_invalid_or_replayed/);
 assert.equal(f.calls.some(c=>c.sql.startsWith('INSERT')),false);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.releases(),1);
});
test('failed insert rolls back consumed challenge',async()=>{
 const f=fixture({insertFails:true});
 await assert.rejects(()=>f.store.enrollAtomically({record,challenge:'challenge-a'}),/insert_failure/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.releases(),1);
});
test('revoke is account-scoped and uses parameterized SQL',async()=>{
 const f=fixture();await f.store.revokeIfOwned('owner-a',record.id,1200);
 assert.deepEqual(f.calls[0].args,['owner-a',record.id,1200]);
});
test('requires transactional pool and no network on import',()=>{
 assert.throws(()=>createPostgresDeviceStore({query:async()=>({})}),/transactional_database_required/);
});
