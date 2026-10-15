import assert from 'node:assert/strict';
import test from 'node:test';
import {createRegistrationCoordinator} from './registration-coordinator.mjs';

test('registration requires signed session, verified proof and single-use challenge',async()=>{
 let used=false,enrolled=0;const expected={subject:'member-1',assurance:'session-only'};
 const coordinator=createRegistrationCoordinator({
 verifySession:async token=>token==='valid'?expected:null,
 verifyRegistration:async()=>({credentialId:'cred-1',publicKey:'p'.repeat(64),userVerified:true}),
 challengeService:{
 issue:async()=>({challenge:'challenge-1',expiresAt:2000}),
 consume:async p=>{if(used||p.subject!=='member-1')return false;used=true;return true;}
 },
 deviceRegistry:{enroll:async(ctx,record)=>{enrolled++;assert.equal(ctx.subject,'member-1');assert.equal(record.proofVerified,true);return {id:'device-1'};}}
 });
 const options={rpId:'connect.example.test',origin:'https://connect.example.test'};
 await assert.rejects(()=>coordinator.begin('forged',options),/session_required/);
 assert.equal((await coordinator.begin('valid',options)).challenge,'challenge-1');
 const form={challenge:'challenge-1',attestation:{},type:'android',label:'Phone',...options};
 assert.equal((await coordinator.finish('valid',form)).id,'device-1');
 assert.equal(enrolled,1);
 await assert.rejects(()=>coordinator.finish('valid',form),/challenge_invalid_or_replayed/);
 assert.equal(enrolled,1);
});
test('unverified registration is never enrolled',async()=>{
 const coordinator=createRegistrationCoordinator({
 verifySession:async()=>({subject:'user',assurance:'session-only'}),
 verifyRegistration:async()=>({publicKey:'p',credentialId:'id',userVerified:false}),
 challengeService:{issue:async()=>({}),consume:async()=>true},
 deviceRegistry:{enroll:async()=>{throw Error('must_not_enroll');}}
 });
 await assert.rejects(()=>coordinator.finish('x',{challenge:'c',attestation:{},rpId:'x',origin:'https://x',type:'android',label:'A'}),/registration_proof_invalid/);
});
