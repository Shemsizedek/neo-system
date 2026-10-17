import test from 'node:test';
import assert from 'node:assert/strict';
import {WireCredentialRegistry} from './wire-credential-registry.mjs';

function memoryAdapter(){
 const map=new Map();
 return {
   async get(k){return map.get(k)??null},
   async put(k,v,{createOnly}={}){if(!createOnly||map.has(k))throw new Error('duplicate');map.set(k,structuredClone(v))},
   async delete(){throw new Error('disabled')},
   async compareAndSwap(k,expected,next){if(JSON.stringify(map.get(k))!==JSON.stringify(expected))return false;map.set(k,structuredClone(next));return true}
 };
}
const scope={credentialId:'cred-1',memberId:'member-1',rpId:'wire.holytemples.org'};
test('registry requires storage',()=>assert.throws(()=>new WireCredentialRegistry(),/durable_store_required/));
test('registration prevents duplicates and rejects cross-member access',async()=>{
 const registry=new WireCredentialRegistry({store:memoryAdapter()});
 await registry.register({...scope,publicKey:'test-public-key'});
 await assert.rejects(()=>registry.register({...scope,publicKey:'test-public-key'}),/already_registered/);
 assert.equal(await registry.getForVerification({...scope,memberId:'other'}),null);
 assert.equal(await registry.getForVerification({...scope,rpId:'other.example'}),null);
});
test('counter updates reject replay and stale expected state',async()=>{
 const registry=new WireCredentialRegistry({store:memoryAdapter()});
 await registry.register({...scope,publicKey:'test-public-key',signCount:3});
 assert.equal(await registry.updateCounter({...scope,expectedCounter:3,newCounter:4}),true);
 assert.equal(await registry.updateCounter({...scope,expectedCounter:3,newCounter:5}),false);
 assert.equal(await registry.updateCounter({...scope,expectedCounter:4,newCounter:4}),false);
});
test('revoked credentials cannot authenticate',async()=>{
 const registry=new WireCredentialRegistry({store:memoryAdapter()});
 await registry.register({...scope,publicKey:'test-public-key'});
 assert.equal(await registry.revoke(scope),true);
 assert.equal(await registry.getForVerification(scope),null);
});
test('missing atomic compare-and-swap fails closed',async()=>{
 const store=memoryAdapter();delete store.compareAndSwap;
 const registry=new WireCredentialRegistry({store});
 await registry.register({...scope,publicKey:'test-public-key'});
 await assert.rejects(()=>registry.revoke(scope),/atomic_update_required/);
});
