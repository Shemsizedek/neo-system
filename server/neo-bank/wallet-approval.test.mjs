import test from 'node:test';
import assert from 'node:assert/strict';
import {requireWalletApproval,transferApprovalDigest} from './wallet-approval.mjs';
const transfer={toAccount:'CES-ABCDEFGHIJ',amount:10.25,memo:'community work',idempotencyKey:'once-123456'};
test('deterministic intent digest and binding',()=>{
 const d=transferApprovalDigest('google:member',transfer);
 assert.match(d,/^[0-9a-f]{64}$/);
 assert.equal(d,transferApprovalDigest('google:member',{...transfer}));
 assert.notEqual(d,transferApprovalDigest('google:other',transfer));
 assert.notEqual(d,transferApprovalDigest('google:member',{...transfer,amount:11.25}));
 assert.notEqual(d,transferApprovalDigest('google:member',{...transfer,idempotencyKey:'once-654321'}));
});
test('absent verifier fails closed',async()=>assert.rejects(requireWalletApproval({subject:'google:member',transfer,approval:{id:'a'}}),/wallet_approval_unavailable/));
test('absent approval fails closed',async()=>assert.rejects(requireWalletApproval({subject:'google:member',transfer,verifyApproval:async()=>true}),/wallet_approval_required/));
test('untrusted verifier result rejected',async()=>assert.rejects(requireWalletApproval({subject:'google:member',transfer,approval:{id:'a'},verifyApproval:async()=>({verified:true})}),/wallet_approval_rejected/));
test('trusted verifier must affirm exact digest',async()=>{
 let seen;
 const digest=await requireWalletApproval({subject:'google:member',transfer,approval:{id:'a'},verifyApproval:async input=>{seen=input;return true;}});
 assert.equal(seen.digest,digest);assert.equal(seen.operation,'ces.transfer');assert.equal(seen.subject,'google:member');
});
test('invalid financial intent rejected',()=>assert.throws(()=>transferApprovalDigest('google:member',{...transfer,amount:Infinity}),/wallet_approval_invalid_intent/));
