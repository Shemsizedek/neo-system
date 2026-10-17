import test from 'node:test';
import assert from 'node:assert/strict';
import {createGateway,forwardPortal} from '../dist/server/index.js';
const snapshots={portal:{'/':'<h1>Templist Portal</h1>','/portal.js':'console.log("portal")'},assets:{'/assets/neo-suite.js':'customElements.define'},pages:{system:'<h1>NEO System</h1>',hub:'<h1>NEO Hub</h1>'},records:[{id:'one',title:'Public source'}],details:{one:{id:'one',title:'Public source'}}};
test('public pages and assets remain available when every backend fails',async()=>{
 let calls=0;const gateway=createGateway(snapshots,async()=>{calls++;throw Error('offline');});
 for(const url of ['https://egov.holytemples.org/','https://egov.holytemples.org/portal.js','https://neo.holytemples.org/','https://neo.holytemples.org/assets/neo-suite.js','https://hub.holytemples.org/'])assert.equal((await gateway.fetch(new Request(url))).status,200);
 assert.equal(calls,0);
 const head=await gateway.fetch(new Request('https://egov.holytemples.org/',{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');assert.match(head.headers.get('content-security-policy'),/form-action 'self'/);
 const outage=await gateway.fetch(new Request('https://egov.holytemples.org/api/v1/auth/session'));assert.equal(outage.status,503);assert.equal(outage.headers.get('cache-control'),'no-store');
});
test('member operations retain backend authorization and do not cache sessions',async()=>{
 const response=await forwardPortal(new Request('https://egov.holytemples.org/portal',{headers:{cookie:'session=test','x-neopass-subject':'forged'}}),async(url,options)=>{
  assert.equal(url.origin,'https://neo-platform-api-recovery.onrender.com');assert.equal(options.headers.get('x-neopass-subject'),null);assert.equal(options.headers.get('cookie'),'session=test');return new Response('Sign in',{status:401});
 });assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('cross-site writes fail closed before reaching the origin',async()=>{
 let calls=0;const response=await forwardPortal(new Request('https://egov.holytemples.org/login',{method:'POST',headers:{origin:'https://attacker.example','sec-fetch-site':'cross-site'},body:'x=1'}),async()=>{calls++;return new Response('unexpected');});assert.equal(response.status,403);assert.equal(calls,0);
});
test('login redirects stay on the canonical host and session cookies survive',async()=>{
 const response=await forwardPortal(new Request('https://egov.holytemples.org/portal'),async()=>new Response(null,{status:302,headers:{location:'https://neo-platform-api-recovery.onrender.com/?session=expired','set-cookie':'session=; Path=/; HttpOnly; Secure; SameSite=Lax'}}));
 assert.equal(response.headers.get('location'),'/?session=expired');assert.match(response.headers.get('set-cookie'),/HttpOnly/);
});
test('only public snapshot records are served and missing records stay 404',async()=>{
 const gateway=createGateway(snapshots);const result=await gateway.fetch(new Request('https://neo.holytemples.org/api/noogle/search?q=public'));assert.equal((await result.json()).records.length,1);
 assert.equal((await gateway.fetch(new Request('https://neo.holytemples.org/api/library/private'))).status,404);
 assert.equal((await gateway.fetch(new Request('https://neo.holytemples.org/api/private'))).status,503);
});
