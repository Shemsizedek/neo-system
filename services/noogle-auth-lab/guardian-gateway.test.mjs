import test from 'node:test';
import assert from 'node:assert/strict';
import {issueNeopassToken} from '../../server/neo-platform-api/neopass-google-auth.mjs';
import {createGuardianServer} from './guardian-gateway.mjs';
const secret='local-test-only-secret';
const now=()=>Date.UTC(2026,9,14,12,0,0);
async function withServer(callback){
 const server=createGuardianServer({secret,now});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{return await callback('http://127.0.0.1:'+server.address().port);}
 finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
test('public capability endpoint remains disabled',()=>withServer(async base=>{
 const res=await fetch(base+'/api/guardian/capabilities');
 assert.equal(res.status,200);assert.equal((await res.json()).remote_terminal,'disabled');
}));
test('unauthenticated session fails closed',()=>withServer(async base=>{
 const res=await fetch(base+'/api/guardian/session');assert.equal(res.status,401);
}));
test('NEO Pass signature verification gives subject without privileges',()=>withServer(async base=>{
 const token=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300});
 const res=await fetch(base+'/api/guardian/session',{headers:{Authorization:'Bearer '+token}});
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{authenticated:true,subject:'user:test'});
 const blocked=await fetch(base+'/api/guardian/terminal/requests',{method:'POST',headers:{Authorization:'Bearer '+token}});
 assert.equal(blocked.status,403);
}));
test('rejects tampered and differently scoped identity tokens',()=>withServer(async base=>{
 const token=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300});
 const bad=await fetch(base+'/api/guardian/session',{headers:{Authorization:'Bearer '+token+'x'}});
 assert.equal(bad.status,401);
 const privileged=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300,claims:{scope:'crown:root-enroll',token_use:'crown-office-attestation'}});
 const res=await fetch(base+'/api/guardian/session',{headers:{Authorization:'Bearer '+privileged}});
 assert.equal(res.status,401);
}));
test('unknown paths do not leak service data',()=>withServer(async base=>{
 const res=await fetch(base+'/unknown');assert.equal(res.status,404);
}));
