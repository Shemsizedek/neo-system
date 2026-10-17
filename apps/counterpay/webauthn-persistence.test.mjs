import test from 'node:test';import assert from 'node:assert/strict';
import {createRedisChallengeStore} from './webauthn-persistence.mjs';
test('challenge can only be consumed once',async()=>{const map=new Map();const redis={async set(k,v,opts){if(opts.NX!==true||opts.PX!==120000||map.has(k))return null;map.set(k,v);return 'OK'},async getDel(k){const x=map.get(k);map.delete(k);return x??null}};const store=createRedisChallengeStore(redis);await store.issue('nonce-1',{a:1});await assert.rejects(store.issue('nonce-1',{a:2}),/Duplicate/);assert.deepEqual(await store.consume('nonce-1'),{a:1});assert.equal(await store.consume('nonce-1'),null)});
test('requires atomic Redis interface',()=>assert.throws(()=>createRedisChallengeStore({set(){}}),/Atomic/));
