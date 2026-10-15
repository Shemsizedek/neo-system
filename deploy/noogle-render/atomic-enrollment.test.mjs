import assert from 'node:assert/strict';
import test from 'node:test';
import {createAtomicEnrollment} from './atomic-enrollment.mjs';
function fixture(failInsert=false){
 const calls=[];let released=false;
 const client={query:async(sql,args=[])=>{calls.push({sql,args});if(sql.startsWith('UPDATE'))return {rows:[{subject_id:'member'}]};if(sql.startsWith('INSERT')){if(failInsert)throw Error('db_write_failed');return {rows:[{id:'device'}]};}return {rows:[]};},release:()=>{released=true;}};
 const fn=createAtomicEnrollment({pool:{connect:async()=>client},proofConsumer:{consume:()=>({credentialId:'cred',publicKey:'pub'})}});
 const request={subject:'member',proof:{},challengeHash:'hash',rpId:'example.test',origin:'https://example.test',id:'device',type:'android',label:'Phone',now:1000};
 return {fn,request,calls,released:()=>released};
}
test('commits challenge and device insert together',async()=>{
 const f=fixture(),result=await f.fn(f.request);
 assert.equal(result.registered,true);assert.deepEqual(result.permissions,[]);
 assert.deepEqual(f.calls.map(x=>x.sql.split(' ')[0]),['BEGIN','UPDATE','INSERT','COMMIT']);
 assert.equal(f.calls[1].args.length,5);assert.equal(f.released(),true);
});
test('rolls back both changes when device insert fails',async()=>{
 const f=fixture(true);
 await assert.rejects(()=>f.fn(f.request),/db_write_failed/);
 assert.equal(f.calls.at(-1).sql,'ROLLBACK');assert.equal(f.released(),true);
});
test('proof is mandatory',async()=>{
 const fn=createAtomicEnrollment({pool:{connect:async()=>{throw Error('should_not_connect');}},proofConsumer:{consume:()=>{throw Error('verified_proof_required');}}});
 await assert.rejects(()=>fn(fixture().request),/verified_proof_required/);
});

test('enrollment hashes only the trusted proof credential and public key',async()=>{
 const f=fixture();
 await f.fn({...f.request,publicKeyHash:'client-forgery'});
 const inserted=f.calls.find(x=>x.sql.startsWith('INSERT'));
 assert.equal(inserted.args[4].length,64);
 assert.equal(inserted.args[6].length,64);
 assert.notEqual(inserted.args[4],'client-forgery');
});
