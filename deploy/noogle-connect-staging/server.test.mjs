import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {handler} from './server.mjs';
async function run(fn){const s=http.createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));try{return await fn('http://127.0.0.1:'+s.address().port)}finally{await new Promise(r=>s.close(r))}}
test('health is explicitly read-only',()=>run(async url=>{const r=await fetch(url+'/healthz');assert.equal(r.status,200);assert.equal((await r.json()).mode,'read-only')}));
test('privileged capabilities are disabled',()=>run(async url=>{const r=await fetch(url+'/api/guardian/capabilities');const v=await r.json();assert.equal(v.remote_terminal,'disabled');assert.equal(v.device_enrollment,'not_enabled');assert.equal(v.identity_session,'not_verified')}));
test('no privileged API endpoint',()=>run(async url=>{for(const p of ['/api/guardian/session','/api/guardian/terminal','/api/guardian/passkeys/registration/options'])assert.equal((await fetch(url+p)).status,403)}));
test('writes are rejected',()=>run(async url=>assert.equal((await fetch(url+'/api/guardian/terminal',{method:'POST'})).status,405)));
test('page is read-only and not cached',()=>run(async url=>{const r=await fetch(url);assert.equal(r.status,200);assert.match(await r.text(),/read-only preview/i);assert.match(r.headers.get('cache-control'),/no-store/)}));
