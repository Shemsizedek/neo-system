import test from 'node:test';
import assert from 'node:assert/strict';
import {PasskeyChallengeStore} from './wire-passkey-challenges.mjs';
import {createWirePasskeyService} from './wire-passkey-service.mjs';

test('failed registration verification burns challenge',async()=>{
 const challenges=new PasskeyChallengeStore();
 const service=createWirePasskeyService({
  challenges,
  credentials:{register:async()=>{throw new Error('must_not_register')}},
  verifier:{verifyRegistration:async()=>{throw new Error('signature_invalid')}}
 });
 const {challenge}=service.beginRegistration({memberId:'m1'});
 await assert.rejects(()=>service.finishRegistration({memberId:'m1',challenge,response:{}}),/signature_invalid/);
 await assert.rejects(()=>service.finishRegistration({memberId:'m1',challenge,response:{}}),/invalid_or_expired_challenge/);
});

test('authentication rejects credentials not owned by member',async()=>{
 const challenges=new PasskeyChallengeStore();
 const service=createWirePasskeyService({
  challenges,
  credentials:{getForVerification:async()=>null},
  verifier:{verifyAuthentication:async()=>{throw new Error('must_not_verify')}}
 });
 const {challenge}=service.beginAuthentication({memberId:'m1'});
 await assert.rejects(()=>service.finishAuthentication({memberId:'m1',challenge,credentialId:'other-member-credential',response:{}}),/credential_not_authorized/);
});
