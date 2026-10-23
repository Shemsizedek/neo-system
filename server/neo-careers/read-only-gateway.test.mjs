import test from 'node:test'
import assert from 'node:assert/strict'
import {createCareersReadOnlyGateway} from './read-only-gateway.mjs'
const verified={database:{connectionTestPassed:true,migrationsApplied:true,tenantIsolationVerified:true},identity:{issuerVerified:true,tokenSignatureVerified:true,audienceVerified:true,replayProtectionVerified:true}}
const claims={sub:'worker1',iss:'https://id.example',aud:'neo-careers',exp:Math.floor(Date.now()/1000)+1800,roles:['contributor'],employerId:'firm1'}
test('unverified dependencies prevent queries and sign-in',async()=>{let called=0;const g=createCareersReadOnlyGateway({query:async()=>{called++;return {rows:[]}},verifyIdentity:async()=>{called++;return claims}});assert.equal((await g.records({credential:'test',view:'worker'})).ok,false);assert.equal(called,0)})
test('verified worker may query own scoped records',async()=>{let args;const g=createCareersReadOnlyGateway({query:async(sql,a)=>{args=a;return {rows:[]}},verifyIdentity:async()=>claims,dependencyEvidence:verified});assert.equal((await g.records({credential:'opaque',view:'worker'})).ok,true);assert.deepEqual(args,['worker1'])})
test('invalid verifier result rejects identity',async()=>{const g=createCareersReadOnlyGateway({query:async()=>({rows:[]}),verifyIdentity:async()=>null,dependencyEvidence:verified});assert.equal((await g.records({credential:'opaque',view:'worker'})).ok,false)})
test('unsupported view cannot read data',async()=>{let called=false;const g=createCareersReadOnlyGateway({query:async()=>{called=true;return {rows:[]}},verifyIdentity:async()=>claims,dependencyEvidence:verified});assert.equal((await g.records({credential:'opaque',view:'admin'})).ok,false);assert.equal(called,false)})
test('composed gateway has no transfers',()=>assert.equal(createCareersReadOnlyGateway({query:async()=>({rows:[]}),verifyIdentity:async()=>claims}).status().paymentEnabled,false))
