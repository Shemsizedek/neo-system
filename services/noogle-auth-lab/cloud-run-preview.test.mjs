import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {handler} from './cloud-run-preview.mjs';

async function serve(fn){
 const s=http.createServer(handler);
 await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
 try { return await fn('http://127.0.0.1:'+s.address().port); }
 finally { await new Promise((resolve,reject)=>s.close(e=>e?reject(e):resolve())); }
}
test('read-only health announces staging',()=>serve(async base=>{
 const r=await fetch(base+'/healthz');assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{ok:true,service:'noogle-connect-staging',mode:'read-only'});
}));
test('device and terminal capabilities are disabled',()=>serve(async base=>{
 const r=await fetch(base+'/api/guardian/capabilities');const j=await r.json();
 assert.equal(j.device_enrollment,'not_enabled');assert.equal(j.remote_terminal,'disabled');
 assert.equal(j.identity_session,'not_verified');
}));
test('all API writes fail closed',()=>serve(async base=>{
 for(const path of ['/api/guardian/passkeys/registration/options','/api/guardian/terminal','/api/guardian/devices']){
  const r=await fetch(base+path,{method:'POST'});assert.equal(r.status,405);
 }
}));
test('unknown API reads fail closed',()=>serve(async base=>{
 const r=await fetch(base+'/api/guardian/session');assert.equal(r.status,403);
}));
test('preview files served with no-store',()=>serve(async base=>{
 for(const path of ['/','/passkeys.js','/manifest.webmanifest']){
  const r=await fetch(base+path);assert.equal(r.status,200);
  assert.match(r.headers.get('cache-control')||'',/no-store/);
 }
}));
test('path traversal never serves repository data',()=>serve(async base=>{
 const r=await fetch(base+'/not-a-file');assert.equal(r.status,404);
}));
