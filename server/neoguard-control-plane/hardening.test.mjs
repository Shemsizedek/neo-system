import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoGuardServer} from './index.mjs';

const bootstrap='this-is-a-long-test-enrollment-token';
const endpointId='neo:endpoint:000001';
const fingerprint='AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';
async function setup(opts={}){const s=createNeoGuardServer({enrollmentToken:bootstrap,...opts});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${s.address().port}`;const enroll=await fetch(base+'/v1/enroll',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${bootstrap}`},body:JSON.stringify({endpointId,hostPublicKeyFingerprint:fingerprint})});const token=(await enroll.json()).deviceToken;return{s,base,token};}
async function beat(base,token,p={}){return fetch(base+'/v1/heartbeat',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({endpointId,nonce:'abcdefghijklmnop',sentAt:new Date().toISOString(),...p})});}

test('authenticated requests require fresh nonce and refuse replay',async()=>{const {s,base,token}=await setup();try{const sentAt=new Date().toISOString();assert.equal((await beat(base,token,{nonce:'unique_nonce_0001',sentAt})).status,200);const r=await beat(base,token,{nonce:'unique_nonce_0001',sentAt});assert.equal(r.status,400);assert.equal((await r.json()).error,'replay_refused');}finally{s.close();}});

test('expired timestamp is refused',async()=>{const now=new Date('2026-09-16T03:30:00Z');const {s,base,token}=await setup({now:()=>now,nonceTtlMs:300000});try{const r=await beat(base,token,{nonce:'unique_nonce_0002',sentAt:'2026-09-16T03:00:00Z'});assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_or_expired_nonce');}finally{s.close();}});

test('per-endpoint rate limit fails closed',async()=>{const now=new Date('2026-09-16T03:30:00Z');const {s,base,token}=await setup({now:()=>now,rateLimit:1});try{assert.equal((await beat(base,token,{nonce:'unique_nonce_0003',sentAt:now.toISOString()})).status,200);const r=await beat(base,token,{nonce:'unique_nonce_0004',sentAt:now.toISOString()});assert.equal(r.status,429);assert.equal((await r.json()).error,'rate_limited');}finally{s.close();}});

test('biometric material is refused',async()=>{const {s,base,token}=await setup();try{const r=await beat(base,token,{nonce:'unique_nonce_0005',biometric:'template'});assert.equal(r.status,400);assert.equal((await r.json()).error,'secret_material_refused');}finally{s.close();}});
