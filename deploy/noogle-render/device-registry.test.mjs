import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeviceRegistry } from './device-registry.mjs';

function fixture(){
 const records=[];
 const store={
  async list(subject){return records.filter(r=>r.subject===subject);},
  async findByKey(subject,key){return records.find(r=>r.subject===subject && r.publicKeyHash===key && !r.revokedAt);},
  async insert(row){records.push(row);},
  async revokeIfOwned(subject,id,time){
    const item=records.find(r=>r.subject===subject && r.id===id && !r.revokedAt);
    if(!item)return false;
    item.revokedAt=time;return true;
  }
 };
 const registry=createDeviceRegistry({
  store,now:()=>1000,
  verifyIdentity:async context=>context?.subject?{subject:context.subject,assurance:context.assurance}:null
 });
 return {registry,records};
}
const proof={type:'android',label:'Phone',publicKey:'a'.repeat(64),proofVerified:true};
test('unauthenticated or weakly authenticated users cannot enroll or list',async()=>{
 const {registry}=fixture();
 await assert.rejects(()=>registry.list(null),/authentication_required/);
 await assert.rejects(()=>registry.enroll({subject:'a',assurance:'password'},proof),/authentication_required/);
 await assert.rejects(()=>registry.enroll({subject:'a',assurance:'device-bound'},{...proof,proofVerified:false}),/enrollment_preconditions_failed/);
});
test('registry operations enforce user ownership and revocation',async()=>{
 const {registry,records}=fixture();
 const a={subject:'a',assurance:'device-bound'},b={subject:'b',assurance:'device-bound'};
 const enrolled=await registry.enroll(a,proof);
 assert.equal((await registry.list(a)).length,1);
 assert.equal((await registry.list(b)).length,0);
 assert.equal(records[0].publicKey,undefined);
 await assert.rejects(()=>registry.revoke(b,enrolled.id),/device_not_found/);
 await registry.revoke(a,enrolled.id);
 assert.equal((await registry.list(a))[0].revokedAt,1000);
 await assert.rejects(()=>registry.revoke(a,enrolled.id),/device_not_found/);
});
