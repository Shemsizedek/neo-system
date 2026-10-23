import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAtomicWalletFinalizer} from './atomic-wallet-finalizer.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const digest='a'.repeat(64),approvalId='approval-123',challenge='nonce-'.padEnd(40,'x'),credentialId='passkey-1';
const request={subject:'member',digest,approvalId,challenge,credentialId,expectedCounter:5,newCounter:6,verified:true};
function fixture(overrides={}){
 const data=new Map([
 ['neoBankWalletApprovals/'+hash(approvalId),{subject:'member',digest,state:'pending',operation:'ces.transfer',expiresAtMs:200}],
 ['neoBankWalletChallenges/'+hash(challenge),{subject:'member',digest,status:'pending',operation:'ces.transfer',approvalId,challenge,expiresAtMs:200}],
 ['neoMaskCredentials/'+hash(credentialId),{subject:'member',status:'active',rpId:'connect.holytemples.org',counter:5}]
 ]);
 for(const [key,v] of Object.entries(overrides))data.set(key,v);
 const db={collection:name=>({doc:id=>({key:name+'/'+id})}),runTransaction:async fn=>{
  const pending=[];
  const tx={get:async ref=>({exists:data.has(ref.key),data:()=>({...data.get(ref.key)})}),update:(ref,v)=>pending.push([ref.key,v])};
  const out=await fn(tx);for(const [key,v] of pending)data.set(key,{...data.get(key),...v});return out;
 }};
 return {db,data};
}
test('stages all three state updates and commits together',async()=>{
 const f=fixture(),stage=createAtomicWalletFinalizer({db:f.db,clock:()=>100});
 await f.db.runTransaction(async tx=>{const finalize=await stage(tx,request);finalize('entry-1')});
 assert.equal(f.data.get('neoBankWalletApprovals/'+hash(approvalId)).state,'consumed');
 assert.equal(f.data.get('neoBankWalletChallenges/'+hash(challenge)).status,'consumed');
 assert.equal(f.data.get('neoMaskCredentials/'+hash(credentialId)).counter,6);
 await assert.rejects(f.db.runTransaction(async tx=>{const finalize=await stage(tx,request);finalize('entry-2')}),/wallet_authorization_rejected/);
});
test('failed posting leaves all authentication state unchanged',async()=>{
 const f=fixture(),stage=createAtomicWalletFinalizer({db:f.db,clock:()=>100});
 await assert.rejects(f.db.runTransaction(async tx=>{await stage(tx,request);throw Error('posting_failed')}),/posting_failed/);
 assert.equal(f.data.get('neoBankWalletApprovals/'+hash(approvalId)).state,'pending');
 assert.equal(f.data.get('neoMaskCredentials/'+hash(credentialId)).counter,5);
});
test('unverified assertions and counter replay fail closed',async()=>{
 const f=fixture(),stage=createAtomicWalletFinalizer({db:f.db,clock:()=>100});
 await assert.rejects(f.db.runTransaction(tx=>stage(tx,{...request,verified:false})),/wallet_authentication_required/);
 await assert.rejects(f.db.runTransaction(tx=>stage(tx,{...request,newCounter:5})),/wallet_authentication_required/);
});
test('expired challenge prevents approval',async()=>{
 const f=fixture(),stage=createAtomicWalletFinalizer({db:f.db,clock:()=>201});
 await assert.rejects(f.db.runTransaction(tx=>stage(tx,request)),/wallet_authorization_rejected/);
});
