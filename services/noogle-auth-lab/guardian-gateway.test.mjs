import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {issueNeopassToken} from '../../server/neo-platform-api/neopass-google-auth.mjs';
import {createGuardianServer} from './guardian-gateway.mjs';

// Use Node's HTTP transport to set Host deterministically in loopback tests.
function request(url,{method='GET',headers={}}={}){
 return new Promise((resolve,reject)=>{
  const target=new URL(url);
  const req=http.request({hostname:target.hostname,port:target.port,path:target.pathname,method,headers},res=>{
   const chunks=[];
   res.on('data',x=>chunks.push(x));
   res.on('end',()=>{
    const body=Buffer.concat(chunks).toString('utf8');
    resolve({status:res.statusCode,headers:{get:k=>res.headers[k.toLowerCase()]||null},json:async()=>JSON.parse(body)});
   });
  });
  req.on('error',reject);req.end();
 });
}

const secret='local-test-only-secret';
const now=()=>Date.UTC(2026,9,14,12,0,0);
async function withServer(callback){
 const server=createGuardianServer({secret,now});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 try{return await callback('http://127.0.0.1:'+server.address().port);}
 finally{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
test('public capability endpoint remains disabled',()=>withServer(async base=>{
 const res=await request(base+'/api/guardian/capabilities');
 assert.equal(res.status,200);assert.equal((await res.json()).remote_terminal,'disabled');
}));
test('unauthenticated session fails closed',()=>withServer(async base=>{
 const res=await request(base+'/api/guardian/session',{headers:{Host:'connect.holytemples.org'}});assert.equal(res.status,401);
}));
test('NEO Pass signature verification gives subject without privileges',()=>withServer(async base=>{
 const token=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300});
 const res=await request(base+'/api/guardian/session',{headers:{Host:'connect.holytemples.org',Authorization:'Bearer '+token}});
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{authenticated:true,subject:'user:test'});
 const blocked=await request(base+'/api/guardian/terminal/requests',{method:'POST',headers:{Host:'connect.holytemples.org',Authorization:'Bearer '+token}});
 assert.equal(blocked.status,403);
}));
test('rejects tampered and differently scoped identity tokens',()=>withServer(async base=>{
 const token=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300});
 const bad=await request(base+'/api/guardian/session',{headers:{Host:'connect.holytemples.org',Authorization:'Bearer '+token+'x'}});
 assert.equal(bad.status,401);
 const privileged=issueNeopassToken({subject:'user:test',secret,now,ttlSeconds:300,claims:{scope:'crown:root-enroll',token_use:'crown-office-attestation'}});
 const res=await request(base+'/api/guardian/session',{headers:{Host:'connect.holytemples.org',Authorization:'Bearer '+privileged}});
 assert.equal(res.status,401);
}));
test('unknown paths do not leak service data',()=>withServer(async base=>{
 const res=await request(base+'/unknown');assert.equal(res.status,404);
}));

test('rejects untrusted host on session endpoint',()=>withServer(async base=>{const res=await request(base+'/api/guardian/session');assert.equal(res.status,403);}));
test('session response disallows caching',()=>withServer(async base=>{const res=await request(base+'/api/guardian/session',{headers:{Host:'connect.holytemples.org'}});assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('vary'),'Authorization');}));
