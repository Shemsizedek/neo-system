import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoMaskRegistration} from './neomask-registration.mjs';
test('NEO Pass owner receives RP-locked credential creation options and only valid proof saves',async()=>{
 const saved=[];let consumed=0;
 const register=createNeoMaskRegistration({
 verifyNeoPass:async t=>t==='valid'?{subject:'user-1',assurance:'session-only'}:null,
 issueChallenge:async()=>({challenge:'challenge1',expiresAt:9999}),
 consumeChallenge:async x=>{assert.equal(x.subject,'user-1');consumed++;return consumed===1;},
 verifyAttestation:async()=>({verified:true,userVerified:true,credentialId:'credential',publicKey:'verified-key',signCount:0}),
 saveCredential:async credential=>{saved.push(credential);}
 });
 await assert.rejects(()=>register.begin('invalid'),/neopass_required/);
 const options=await register.begin('valid');
 assert.equal(options.publicKey.rp.id,'connect.holytemples.org');
 assert.equal(options.publicKey.authenticatorSelection.userVerification,'required');
 assert.equal((await register.finish('valid',{attestation:{},challenge:'challenge1'})).registered,true);
 assert.equal(saved.length,1);
 await assert.rejects(()=>register.finish('valid',{attestation:{},challenge:'challenge1'}),/expired_or_replayed_passkey_challenge/);
});
test('rejects unverified attestation and untrusted RP configuration',async()=>{
 assert.throws(()=>createNeoMaskRegistration({rpId:'evil.example'}),/trusted_neomask_configuration_required/);
 const reg=createNeoMaskRegistration({verifyNeoPass:async()=>({subject:'u',assurance:'session-only'}),issueChallenge:async()=>({challenge:'x',expiresAt:1}),consumeChallenge:async()=>true,verifyAttestation:async()=>({verified:true,userVerified:false}),saveCredential:async()=>{throw Error('must not save');}});
 await assert.rejects(()=>reg.finish('x',{attestation:{},challenge:'x'}),/invalid_passkey_attestation/);
});
