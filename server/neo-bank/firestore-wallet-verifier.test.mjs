import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirestoreWalletVerifier} from './firestore-wallet-verifier.mjs';
const digest='a'.repeat(64);
function fakeDb(row){
 let current={...row};
 const ref={get:async()=>({exists:Boolean(current),data:()=>({...current})})};
 const db={collection:()=>({doc:()=>ref}),runTransaction:async fn=>fn({
  get:async()=>({exists:Boolean(current),data:()=>({...current})}),
  update:(_,data)=>{current={...current,...data}}
 })};
 return {db,read:()=>current};
}
const input={subject:'member-1',digest,operation:'ces.transfer',approval:{id:'approval-1',assertion:'signed-proof'}};
test('requires trusted cryptographic assertion verifier',()=>assert.throws(()=>createFirestoreWalletVerifier({db:fakeDb({}).db}),/unconfigured/));
test('valid approval verifies without premature consumption',async()=>{
 const {db,read}=fakeDb({state:'pending',subject:'member-1',digest,operation:'ces.transfer',expiresAtMs:200});
 const verify=createFirestoreWalletVerifier({db,clock:()=>100,verifyAssertion:async()=>true});
 assert.equal(await verify(input),true);assert.equal(read().state,'pending');assert.equal(await verify(input),true);
});
test('rejects invalid assertion without consuming',async()=>{
 const {db,read}=fakeDb({state:'pending',subject:'member-1',digest,operation:'ces.transfer',expiresAtMs:200});
 const verify=createFirestoreWalletVerifier({db,clock:()=>100,verifyAssertion:async()=>false});
 assert.equal(await verify(input),false);assert.equal(read().state,'pending');
});
test('rejects expired, wrong subject and digest',async()=>{
 for(const row of [
 {state:'pending',subject:'member-1',digest,operation:'ces.transfer',expiresAtMs:99},
 {state:'pending',subject:'other',digest,operation:'ces.transfer',expiresAtMs:200},
 {state:'pending',subject:'member-1',digest:'b'.repeat(64),operation:'ces.transfer',expiresAtMs:200}
 ]){
 const {db}=fakeDb(row),verify=createFirestoreWalletVerifier({db,clock:()=>100,verifyAssertion:async()=>true});
 assert.equal(await verify(input),false);
 }
});
test('invalid operation is rejected',async()=>{
 const {db}=fakeDb({state:'pending',subject:'member-1',digest,operation:'ces.transfer',expiresAtMs:200});
 const verify=createFirestoreWalletVerifier({db,clock:()=>100,verifyAssertion:async()=>true});
 assert.equal(await verify({...input,operation:'credit.issue'}),false);
});
