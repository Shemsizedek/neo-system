import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNoogleOidcHandler} from './noogle-oidc.mjs';
import {createNoogleOidcStore} from './noogle-oidc-store.mjs';
import {createNoogleLoginClient} from './noogle-login-client.mjs';
import {SignJWT,importJWK} from 'jose';
const issuer='https://neopass.example',redirectUri='https://community.example/callback',cookie='__Host-noogle-session='+'s'.repeat(43);
async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'noogle-oidc-')),store=createNoogleOidcStore(join(dir,'oidc.sqlite'));
 const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const handler=await createNoogleOidcHandler({issuer,clients:[{id:'community',name:'Community',redirects:[redirectUri]}],store,accounts:{authenticate:async token=>token==='s'.repeat(43)?{subject:'member',verified:true}:null,active:async()=>true},pairwiseSecret:'fixture-secret-for-pairwise-identity-only',privateJwk:privateKey.export({format:'jwk'}),kid:'fixture',now:()=>1000000});
 const server=http.createServer(async(req,res)=>{if(!await handler(req,res)){res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});});
 const base=`http://127.0.0.1:${server.address().port}`,transport=(url,options)=>fetch(base+new URL(url).pathname,options);
 const jwks=await (await fetch(base+'/oidc/jwks')).json(),client=await createNoogleLoginClient({issuer,clientId:'community',redirectUri,publicJwk:jwks.keys[0],store,transport,now:()=>1000000});
 async function consent(start){const auth=new URL(start.authorizationUrl);const page=await fetch(base+auth.pathname+auth.search,{headers:{cookie}}),html=await page.text(),ticket=html.match(/name="ticket" value="([^"]+)"/)?.[1];assert.ok(ticket);return fetch(base+'/oidc/consent',{method:'POST',redirect:'manual',headers:{cookie,origin:issuer,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({ticket,consent:'allow'}).toString()});}
 return {base,client,consent,store,jwks,privateKey};
}
test('HTTP authorization, consent, code exchange and signed ID token complete client login once',async t=>{
 const f=await fixture(t),start=await f.client.begin(),approved=await f.consent(start);assert.equal(approved.status,303);
 const identity=await f.client.complete(approved.headers.get('location'),start.transactionHandle);assert.equal(identity.verified,true);assert.notEqual(identity.subject,'member');
 await assert.rejects(()=>f.client.complete(approved.headers.get('location'),start.transactionHandle),/invalid_callback/);
 assert.equal(JSON.stringify(f.jwks).includes('"d"'),false);
 const discovery=await (await fetch(f.base+'/.well-known/openid-configuration')).json();assert.equal(discovery.issuer,issuer);
});
test('unknown callback, duplicate parameters, anonymous authorization and forged state are rejected',async t=>{
 const f=await fixture(t),start=await f.client.begin(),url=new URL(start.authorizationUrl);
 let response=await fetch(f.base+url.pathname+url.search);assert.equal(response.status,401);
 url.searchParams.set('redirect_uri','https://evil.example/callback');response=await fetch(f.base+url.pathname+url.search,{headers:{cookie}});assert.equal(response.status,400);
 const approved=await f.consent(start),callback=new URL(approved.headers.get('location'));callback.searchParams.set('state','wrong');await assert.rejects(()=>f.client.complete(callback.href,start.transactionHandle),/invalid_callback/);
 const duplicate=new URL(start.authorizationUrl);duplicate.searchParams.append('state','duplicate');assert.equal((await fetch(f.base+duplicate.pathname+duplicate.search,{headers:{cookie}})).status,400);
});
test('client rejects signed tokens with wrong issuer, audience, nonce or expiry',async t=>{
 const f=await fixture(t),key=await importJWK(f.privateKey.export({format:'jwk'}),'ES256');
 for(const mode of ['issuer','audience','nonce','expiry']){
  let nonce;
  const client=await createNoogleLoginClient({issuer,clientId:'community',redirectUri,publicJwk:f.jwks.keys[0],store:f.store,now:()=>1000000,transport:async()=>{
   const token=await new SignJWT({nonce:mode==='nonce'?'wrong':nonce}).setProtectedHeader({alg:'ES256',kid:'fixture'}).setIssuer(mode==='issuer'?'https://evil.example':issuer).setSubject('fixture-subject').setAudience(mode==='audience'?'other':'community').setIssuedAt(1000).setExpirationTime(mode==='expiry'?999:1300).sign(key);return Response.json({id_token:token});
  }});
  const start=await client.begin();nonce=new URL(start.authorizationUrl).searchParams.get('nonce');const redirect=await f.consent(start);await assert.rejects(()=>client.complete(redirect.headers.get('location'),start.transactionHandle));
 }
});
