import test from 'node:test';
import assert from 'node:assert/strict';
import { PasskeyChallengeStore } from './wire-passkey-challenges.mjs';

test('challenge is bound to member, operation and relying party',()=>{
  const store=new PasskeyChallengeStore();
  const {challenge}=store.issue({memberId:'m1',operation:'wire.approve',rpId:'wire.holytemples.org'});
  assert.equal(store.consumeVerified({challenge,memberId:'m2',operation:'wire.approve',rpId:'wire.holytemples.org'}),false);
  assert.equal(store.consumeVerified({challenge,memberId:'m1',operation:'wire.approve',rpId:'wire.holytemples.org'}),false);
});

test('challenge can be consumed only once',()=>{
  const store=new PasskeyChallengeStore();
  const scope={memberId:'m1',operation:'wire.approve',rpId:'wire.holytemples.org'};
  const {challenge}=store.issue(scope);
  assert.equal(store.consumeVerified({challenge,...scope}),true);
  assert.equal(store.consumeVerified({challenge,...scope}),false);
});

test('expired challenge is rejected',()=>{
  let now=1000;
  const store=new PasskeyChallengeStore({now:()=>now,ttlMs:200});
  const scope={memberId:'m1',operation:'wire.approve',rpId:'wire.holytemples.org'};
  const {challenge}=store.issue(scope);
  now=1200;
  assert.equal(store.consumeVerified({challenge,...scope}),false);
});

test('invalid scopes and capacity are rejected',()=>{
  const store=new PasskeyChallengeStore({maxEntries:1});
  assert.throws(()=>store.issue({memberId:'',operation:'wire.approve',rpId:'wire.holytemples.org'}));
  store.issue({memberId:'m1',operation:'wire.approve',rpId:'wire.holytemples.org'});
  assert.throws(()=>store.issue({memberId:'m2',operation:'wire.approve',rpId:'wire.holytemples.org'}),/capacity/);
});
