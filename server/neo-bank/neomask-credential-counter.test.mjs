import test from 'node:test';
import assert from 'node:assert/strict';
import {createCredentialCounterStore} from './neomask-credential-counter.mjs';
function fake(initial){
 let row={...initial};
 const ref={};
 const db={collection:()=>({doc:()=>ref}),runTransaction:async fn=>fn({
  get:async()=>({exists:true,data:()=>({...row})}),
  update:(_,fields)=>{row={...row,...fields}}
 })};
 return {db,read:()=>row};
}
test('counter only advances for enrolled subject and RP',async()=>{
 const f=fake({subject:'member',rpId:'connect.holytemples.org',status:'active',counter:5});
 const store=createCredentialCounterStore({db:f.db});
 assert.equal(await store.advance({subject:'member',credentialId:'cred1',expectedCounter:5,nextCounter:6}),true);
 assert.equal(f.read().counter,6);
 assert.equal(await store.advance({subject:'member',credentialId:'cred1',expectedCounter:5,nextCounter:7}),false);
 assert.equal(await store.advance({subject:'attacker',credentialId:'cred1',expectedCounter:6,nextCounter:7}),false);
});
test('rejects unchanged, regressing, or invalid counters',async()=>{
 const f=fake({subject:'member',rpId:'connect.holytemples.org',status:'active',counter:5});
 const store=createCredentialCounterStore({db:f.db});
 for(const n of [5,4,-1,NaN])assert.equal(await store.advance({subject:'member',credentialId:'cred1',expectedCounter:5,nextCounter:n}),false);
 assert.equal(f.read().counter,5);
});
