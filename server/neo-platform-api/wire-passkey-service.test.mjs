import test from 'node:test';
import assert from 'node:assert/strict';
import {PasskeyChallengeStore} from './wire-passkey-challenges.mjs';
import {createWirePasskeyService} from './wire-passkey-service.mjs';

test('passkey service requires verifier, registry and challenge store',()=>{
 assert.throws(()=>createWirePasskeyService(),/passkey_dependencies_required/);
});
test('registration is scoped to member and cannot replay',async()=>{
 const challenges=new PasskeyChallengeStore();
 const records=new Map();
 const credentials={
  async register(record){records.set(record.credentialId,record);return record},
  async getForVerification(){return null}
 };
 const verifier={
  async verifyRegistration(){return {credential:{id:'cred1',publicKey:'pubkey',counter:0}}},
  async verifyAuthentication(){throw new Error('unexpected')}
 };
 const service=createWirePasskeyService({challenges,credentials,verifier});
 assert.throws(()=>service.beginRegistration({}),/authenticated_member_required/);
 const {challenge}=service.beginRegistration({memberId:'m1'});
 await assert.rejects(()=>service.finishRegistration({memberId:'m2',challenge,response:{}}),/invalid_or_expired_challenge/);
 await assert.rejects(()=>service.finishRegistration({memberId:'m1',challenge,response:{}}),/invalid_or_expired_challenge/);
 const next=service.beginRegistration({memberId:'m1'});
 const result=await service.finishRegistration({memberId:'m1',challenge:next.challenge,response:{}});
 assert.equal(result.memberId,'m1');
 assert.equal(records.get('cred1').rpId,'wire.holytemples.org');
 await assert.rejects(()=>service.finishRegistration({memberId:'m1',challenge:next.challenge,response:{}}),/invalid_or_expired_challenge/);
});
