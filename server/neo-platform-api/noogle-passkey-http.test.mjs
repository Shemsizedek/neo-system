import test from 'node:test';
import assert from 'node:assert/strict';
import {createNooglePasskeyServer} from './noogle-passkey-http.mjs';
const origin='https://neopass.example',handle='s'.repeat(43);
async function fixture(t,{allowRegistration=true}={}){
 let active=false,revocations=0;const calls=[];
 const accounts={async beginRegistration(browser){calls.push(browser);return {id:'register',options:{challenge:'fixture'}};},async finishRegistration(browser,body){calls.push(body);return {registered:true,loginRequired:true};},async beginLogin(){return {id:'login',options:{challenge:'fixture'}};},async finishLogin(){active=true;return {sessionHandle:handle,expiresAt:901000};},async authenticate(token){return active&&token===handle?{subject:'member'}:null;},async signOut(token){assert.equal(token,handle);active=false;revocations++;}};
 const server=createNooglePasskeyServer({origin,accounts,allowRegistration,now:()=>1000});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const page=await fetch(base),browserCookie=page.headers.get('set-cookie').split(';')[0];
 const call=(path,body={},headers={})=>fetch(base+path,{method:'POST',headers:{origin,'content-type':'application/json','x-noogle-passkey':'1',cookie:browserCookie,...headers},body:JSON.stringify(body)});
 return {base,page,browserCookie,call,calls,revocations:()=>revocations};
}
test('page sets secure browser cookie, serves CSP-safe UI and binds enrollment server-side',async t=>{
 const f=await fixture(t);assert.match(f.page.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);assert.match(f.page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 assert.match(await f.page.text(),/Your account. Your passkey/);
 assert.equal((await f.call('/api/register/options')).status,200);
 assert.equal(f.calls[0],f.browserCookie.split('=')[1]);
 assert.equal((await f.call('/api/register/verify',{id:'r',response:{}})).status,200);
 assert.equal((await fetch(f.base+'/passkey.js')).status,200);assert.equal((await fetch(f.base+'/passkey.css')).status,200);
});
test('login handle stays in HttpOnly cookie and logout revokes it on server',async t=>{
 const f=await fixture(t),response=await f.call('/api/login/verify',{id:'x',response:{}}),sessionCookie=response.headers.get('set-cookie').split(';')[0];
 assert.deepEqual(await response.json(),{authenticated:true});assert.match(response.headers.get('set-cookie'),/Secure; HttpOnly/);
 let result=await fetch(f.base+'/api/session',{headers:{cookie:sessionCookie}});assert.equal((await result.json()).authenticated,true);
 const out=await f.call('/api/logout',{}, {cookie:f.browserCookie+'; '+sessionCookie});assert.equal(out.status,200);assert.match(out.headers.get('set-cookie'),/Max-Age=0/);assert.equal(f.revocations(),1);
 result=await fetch(f.base+'/api/session',{headers:{cookie:sessionCookie}});assert.equal((await result.json()).authenticated,false);
});
test('rejects foreign origin, duplicate/missing browser cookie, client identity and oversized bodies',async t=>{
 const f=await fixture(t);
 assert.equal((await f.call('/api/login/options',{}, {origin:'https://evil.example'})).status,403);
 assert.equal((await f.call('/api/login/options',{}, {cookie:''})).status,401);
 assert.equal((await f.call('/api/login/options',{}, {cookie:f.browserCookie+'; '+f.browserCookie})).status,401);
 assert.equal((await f.call('/api/login/options',{subject:'attacker'})).status,400);
 assert.equal((await f.call('/api/login/verify',{response:'x'.repeat(66000)})).status,413);
});
test('enrollment requires explicit opt-in and rate limits browser ceremony requests',async t=>{
 const f=await fixture(t,{allowRegistration:false});assert.equal((await f.call('/api/register/options')).status,403);
 for(let i=0;i<29;i++)assert.equal((await f.call('/api/login/options')).status,200);
 assert.equal((await f.call('/api/login/options')).status,429);
});
