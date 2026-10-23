import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNeoMaskChallengeIssuer} from './neomask-challenge-issuer.mjs';
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
function dbFixture(approval){
 const docs=new Map([['neoBankWalletApprovals/'+hash('approval-123'),approval]]);
 const collection=name=>({doc:id=>({key:name+'/'+id,async get(){const row=docs.get(this.key);return {exists:!!row,data:()=>row};}})});
 const db={collection,runTransaction:async cb=>cb({
  get:async ref=>{const row=docs.get(ref.key);return {exists:!!row,data:()=>row};},
  create:(ref,value)=>{if(docs.has(ref.key))throw Error('duplicate');docs.set(ref.key,value)}
 })};
 return db;
}
const digest='a'.repeat(64);
const request={subject:'member',authenticatedSubject:'member',digest,operation:'ces.transfer',approvalId:'approval-123'};
test('issuer binds random challenge to authenticated subject and approval expiry',async()=>{
 const db=dbFixture({state:'pending',subject:'member',digest,operation:'ces.transfer',expiresAtMs:11000});
 const service=createNeoMaskChallengeIssuer({db,clock:()=>10000});
 const created=await service.issue(request);
 assert.equal(created.expiresAtMs,11000);
 assert.equal((await service.lookup({...request,challenge:created.challenge})).subject,'member');
 assert.equal(await service.lookup({...request,subject:'other',challenge:created.challenge}),null);
});
test('unverified identity cannot issue challenge',async()=>{
 const db=dbFixture({state:'pending',subject:'member',digest,operation:'ces.transfer',expiresAtMs:200000});
 const service=createNeoMaskChallengeIssuer({db,clock:()=>10000});
 await assert.rejects(service.issue({...request,authenticatedSubject:'attacker'}),/challenge_identity_or_intent_rejected/);
});
test('expired approval denies new challenge',async()=>{
 const db=dbFixture({state:'pending',subject:'member',digest,operation:'ces.transfer',expiresAtMs:9999});
 const service=createNeoMaskChallengeIssuer({db,clock:()=>10000});
 await assert.rejects(service.issue(request),/challenge_approval_unavailable/);
});
