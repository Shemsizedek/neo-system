import test from 'node:test';
import assert from 'node:assert/strict';
import {createWirePasskeyService} from './wire-passkey-service.mjs';

test('registration awaits durable challenge consumption before saving credential',async()=>{
 let resolveConsumption;
 let registered=false;
 const service=createWirePasskeyService({
  challenges:{
   issue:async()=>({challenge:'opaque',expiresInMs:120000}),
   consumeVerified:()=>new Promise(resolve=>{resolveConsumption=resolve})
  },
  credentials:{register:async()=>{registered=true;return {memberId:'m1'}}},
  verifier:{verifyRegistration:async()=>({credential:{id:'c1',publicKey:'key',counter:0}})}
 });
 const {challenge}=await service.beginRegistration({memberId:'m1'});
 const pending=service.finishRegistration({memberId:'m1',challenge,response:{}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(registered,false);
 resolveConsumption(false);
 await assert.rejects(pending,/invalid_or_expired_challenge/);
 assert.equal(registered,false);
});
test('successful durable challenge consumption permits registration',async()=>{
 const service=createWirePasskeyService({
  challenges:{issue:async()=>({challenge:'opaque'}),consumeVerified:async()=>true},
  credentials:{register:async record=>record},
  verifier:{verifyRegistration:async()=>({credential:{id:'c1',publicKey:'key',counter:0}})}
 });
 const {challenge}=await service.beginRegistration({memberId:'m1'});
 const result=await service.finishRegistration({memberId:'m1',challenge,response:{}});
 assert.equal(result.credentialId,'c1');
});
