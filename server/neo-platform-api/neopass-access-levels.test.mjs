import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeopassAccessLevels} from './neopass-access-levels.mjs';
const proof=method=>({method,subject:'member',audience:'service',verified:true,authenticatedAt:1000,userVerified:true});
const evaluate=(proofs,member=true)=>createNeopassAccessLevels({resolveProofs:async()=>proofs,isMember:async()=>member,now:()=>2000});
test('Google entry is sufficient only for basic membership; protected routes require step-up',async()=>{
 const access=evaluate([proof('google')]);assert.equal((await access('session',{service:'service',level:'membership'})).allowed,true);
 for(const level of ['wallet','protected','community','neomaskUnlock'])assert.equal((await access('session',{service:'service',level})).allowed,false);
});
test('same-account Google, wallet and passkey proofs allow community entry without key access',async()=>{
 const result=await evaluate(['google','wallet','passkey'].map(proof))('session',{service:'service',level:'community'});
 assert.equal(result.allowed,true);assert.equal(result.walletKeyAccess,false);
});
test('stale, future, wrong-audience, mismatched-subject and unverified proofs fail',async()=>{
 for(const delta of [{authenticatedAt:-400000},{authenticatedAt:3000},{audience:'other'},{subject:'other'},{verified:false},{userVerified:false}]){
  assert.equal((await evaluate([proof('google'),{...proof('passkey'),...delta}])('session',{service:'service',level:'protected'})).allowed,false);
 }
 assert.equal((await evaluate(['google','wallet','passkey'].map(proof),false)('session',{service:'service',level:'community'})).allowed,false);
});
