import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createEvidenceSessionAuthenticator} from './session-auth.mjs';
import {issueNeopassToken,SESSION_COOKIE} from '../neo-platform-api/neopass-google-auth.mjs';
import {createEvidenceVault} from './store.mjs';
import {createHandler} from './server.mjs';
const secret='synthetic-session-secret-32-characters-long';
const now=()=>Date.parse('2026-10-25T15:00:00Z');
const subject='google:synthetic-evidence';
const origin='https://staging.example.invalid';
const token=(options={})=>issueNeopassToken({subject,secret,now,...options});
const req=(jwt,extra={})=>({method:'GET',headers:{authorization:`Bearer ${jwt}`,...extra}});
const factory=(extra={})=>createEvidenceSessionAuthenticator({registry:{getNEOpassCredential:async sub=>({subject:sub,status:'active'})},jwtSecret:secret,grants:[{subject,roles:['read','review']}],allowedOrigins:[origin],now,...extra});
test('session grants come from operator allowlist and active registry, ignoring signed role claims',async()=>{
 const auth=factory();
 const result=await auth(req(token({claims:{role:'executive-admin'}})));
 assert.deepEqual(result,{actor:subject,roles:['read','review']});
 assert.equal(await factory({grants:[]})(req(token())),null);
 assert.equal(await factory({registry:{getNEOpassCredential:async()=>({subject,status:'paused'})}})(req(token())),null);
 assert.equal(await factory({registry:{getNEOpassCredential:async()=>({subject:'google:wrong',status:'active'})}})(req(token())),null);
});
test('invalid signatures, expired, future, oversized lifetime and non-session scopes are denied',async()=>{
 const auth=factory();
 for(const jwt of [token({secret:'different'}),token({ttlSeconds:-1}),token({now:()=>now()+600000}),token({ttlSeconds:86400}),token({claims:{token_use:'browser',scope:'neo:oracle:execute'}}),token({claims:{aud:'other-service'}})])assert.equal(await auth(req(jwt)),null);
 assert.equal(await auth(req(token(),{origin:'https://untrusted.invalid'})),null);
});
test('same-origin cookie can read only; absent origin, cross-site and duplicate cookies are denied',async()=>{
 const auth=factory();const cookie=`${SESSION_COOKIE}=${token()}`;
 const request={method:'GET',headers:{cookie,origin,'sec-fetch-site':'same-origin'}};
 assert.deepEqual(await auth(request),{actor:subject,roles:['read']});
 assert.deepEqual(await auth({method:'GET',headers:{cookie,host:'staging.example.invalid','sec-fetch-site':'same-origin'}}),{actor:subject,roles:['read']});
 for(const method of ['POST','PATCH'])assert.equal(await auth({...request,method}),null);
 assert.equal(await auth({method:'GET',headers:{cookie}}),null);
 assert.equal(await auth({...request,headers:{...request.headers,'sec-fetch-site':'cross-site'}}),null);
 assert.equal(await auth({...request,headers:{...request.headers,cookie:cookie+'; '+cookie}}),null);
});
test('registry is checked on every request',async()=>{
 let count=0;const auth=factory({registry:{getNEOpassCredential:async()=>({subject,status:++count===1?'active':'revoked'})}});
 assert.ok(await auth(req(token())));assert.equal(await auth(req(token())),null);assert.equal(count,2);
});
test('HTTP adapter fails closed on registry outage and accepts scoped principal without static token',async t=>{
 let unavailable=false;
 const authenticate=factory({registry:{getNEOpassCredential:async()=>{if(unavailable)throw Error('private-details');return {subject,status:'active'}}}});
 const vault=createEvidenceVault(':memory:');
 const server=http.createServer(createHandler(vault,{credentials:[],authenticate}));server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));vault.close()});
 const base=`http://127.0.0.1:${server.address().port}`;
 let res=await fetch(base+'/assets/SYNTHETIC/evidence',{headers:{authorization:`Bearer ${token()}`}});assert.equal(res.status,200);
 unavailable=true;
 res=await fetch(base+'/assets/SYNTHETIC/evidence',{headers:{authorization:`Bearer ${token()}`}});assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'authentication_unavailable'});
});
