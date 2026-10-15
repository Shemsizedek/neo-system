import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeviceRegistry } from './device-registry.mjs';

function fixture(){
 const records=[];
 const store={
  async list(subject){return records.filter(r=>r.subject===subject);},
  async findByKey(subject,key){return records.find(r=>r.subject===subject && r.publicKeyHash===key && !r.revokedAt);},
  async enrollAtomically({record,challenge}){if(challenge!=='valid-device-proof')throw Error('challenge_replay');if(records.some(r=>r.subject===record.subject&&r.publicKeyHash===record.publicKeyHash&&!r.revokedAt))throw Error('device_already_registered');records.push(record);},
  async revokeIfOwned(subject,id,time){
    const item=records.find(r=>r.subject===subject && r.id===id && !r.revokedAt);
    if(!item)return false;
    item.revokedAt=time;return true;
  }
 };
 const registry=createDeviceRegistry({
  store,now:()=>1000,
  verifyEnrollmentProof:async ({challenge})=>challenge==='valid-device-proof',
  verifyIdentity:async context=>context?.subject?{subject:context.subject,assurance:context.assurance}:null
 });
 return {registry,records};
}
const proof={type:'android',label:'Phone',publicKey:'a'.repeat(64),challenge:'valid-device-proof'};
test('unauthenticated or weakly authenticated users cannot enroll or list',async()=>{
 const {registry}=fixture();
 await assert.rejects(()=>registry.list(null),/authentication_required/);
 await assert.rejects(()=>registry.enroll({subject:'a',assurance:'password'},proof),/authentication_required/);
 await assert.rejects(()=>registry.enroll({subject:'a',assurance:'device-bound'},{...proof,challenge:'invalid-device-proof'}),/enrollment_proof_not_verified/);
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

test('caller-supplied proofVerified cannot bypass trusted challenge verifier',async()=>{
 const {registry}=fixture();
 await assert.rejects(()=>registry.enroll({subject:'a',assurance:'device-bound'},{
 type:'chromebook',label:'Laptop',publicKey:'b'.repeat(64),proofVerified:true,challenge:'not-verified'
 }),/enrollment_proof_not_verified/);
});

test('registry demands an atomic durable enrollment adapter',()=>{
 assert.throws(()=>createDeviceRegistry({store:{},verifyIdentity:async()=>({subject:'a',assurance:'device-bound'}),verifyEnrollmentProof:async()=>true}),/secure_store_and_identity_required/);
});
test('duplicate active public keys are rejected within the durable store transaction',async()=>{
 const {registry}=fixture();const context={subject:'a',assurance:'device-bound'};
 await registry.enroll(context,proof);
 await assert.rejects(()=>registry.enroll(context,proof),/device_already_registered/);
});
