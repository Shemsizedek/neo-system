import test from 'node:test';
import assert from 'node:assert/strict';
import {FirestorePasskeyChallengeStore} from './wire-firestore-challenge-store.mjs';

function fakeFirestore(){
 const docs=new Map();
 let queue=Promise.resolve();
 const firestore={runTransaction(fn){
  const work=queue.then(()=>fn({
   get:async ref=>({exists:docs.has(ref.id),data:()=>docs.get(ref.id)}),
   delete:ref=>{docs.delete(ref.id)}
  }));
  queue=work.catch(()=>{});
  return work;
 }};
 return {firestore,doc:id=>({
  id,create:async value=>{if(docs.has(id))throw Error('duplicate');docs.set(id,value)}
 })};
}
test('challenge consumed only once under concurrent verification',async()=>{
 const collection=fakeFirestore();
 const a=new FirestorePasskeyChallengeStore({collection});
 const b=new FirestorePasskeyChallengeStore({collection});
 const {challenge}=await a.issue({memberId:'m1',operation:'passkey.authenticate',rpId:'wire.holytemples.org'});
 const scope={challenge,memberId:'m1',operation:'passkey.authenticate',rpId:'wire.holytemples.org'};
 const results=await Promise.all([a.consumeVerified(scope),b.consumeVerified(scope)]);
 assert.deepEqual(results.sort(),[false,true]);
});
test('scope mismatch burns challenge',async()=>{
 const store=new FirestorePasskeyChallengeStore({collection:fakeFirestore()});
 const {challenge}=await store.issue({memberId:'m1',operation:'passkey.register',rpId:'wire.holytemples.org'});
 assert.equal(await store.consumeVerified({challenge,memberId:'m2',operation:'passkey.register',rpId:'wire.holytemples.org'}),false);
 assert.equal(await store.consumeVerified({challenge,memberId:'m1',operation:'passkey.register',rpId:'wire.holytemples.org'}),false);
});
test('expired challenge is rejected',async()=>{
 let now=100;
 const store=new FirestorePasskeyChallengeStore({collection:fakeFirestore(),now:()=>now,ttlMs:50});
 const {challenge}=await store.issue({memberId:'m1',operation:'passkey.register',rpId:'wire.holytemples.org'});
 now=151;
 assert.equal(await store.consumeVerified({challenge,memberId:'m1',operation:'passkey.register',rpId:'wire.holytemples.org'}),false);
});
