import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createNoogleOidcStore} from './noogle-oidc-store.mjs';
import {createNoogleGoogleLogin} from './noogle-google-login.mjs';
const clientId='123-fixture.apps.googleusercontent.com',origin='https://neopass.example',browser='b'.repeat(43);
async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'noogle-google-')),path=join(dir,'social.sqlite');let store=createNoogleOidcStore(path),active=true,canonicalSubject='existing-temple-owner',time=1000000;
 const {privateKey,publicKey}=await generateKeyPair('RS256',{modulusLength:2048}),publicJwk=await exportJWK(publicKey);
 const config=()=>({origin,clientId,store,keySet:createLocalJWKSet({keys:[{...publicJwk,kid:'fixture',alg:'RS256'}]}),resolveMember:async identity=>{assert.deepEqual(identity,{issuer:'https://accounts.google.com',providerSubject:'stable-owner'});return {active,canonicalSubject};},now:()=>time});
 const service=()=>createNoogleGoogleLogin(config());
 const token=(nonce,claims={},key=privateKey)=>new SignJWT({nonce,email:'untrusted@example.com',...claims}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer(claims.iss||'https://accounts.google.com').setSubject(claims.sub||'stable-owner').setAudience(claims.aud||clientId).setIssuedAt(claims.iat??1000).setExpirationTime(claims.exp??1300).sign(key);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 return {service,token,reopen(){store.close();store=createNoogleOidcStore(path);},disable(){active=false;},remap(){canonicalSubject='other-account';},advance(){time=1400000;}};
}
test('signed Google identity resolves existing canonical account across restart, revocation and logout',async t=>{
 const f=await fixture(t),challenge=await f.service().begin(browser),credential=await f.token(challenge.nonce);
 const session=await f.service().complete(browser,{id:challenge.id,credential});
 f.reopen();const identity=await f.service().resolveEnrollmentIdentity(session.sessionHandle);
 assert.equal(identity.canonicalSubject,'existing-temple-owner');assert.equal(identity.providerSubject,'stable-owner');assert.equal(identity.audience,origin);
 assert.equal(JSON.stringify(identity).includes('untrusted@example.com'),false);
 await assert.rejects(()=>f.service().complete(browser,{id:challenge.id,credential}),/challenge_rejected/);
 f.disable();assert.equal(await f.service().resolveEnrollmentIdentity(session.sessionHandle),null);
 await f.service().signOut(session.sessionHandle);assert.equal(await f.service().resolveEnrollmentIdentity(session.sessionHandle),null);
});
test('wrong audience, issuer, nonce, expiry, azp and signature are rejected',async t=>{
 const f=await fixture(t),other=await generateKeyPair('RS256',{modulusLength:2048});
 for(const mode of ['aud','iss','nonce','exp','azp','signature']){
  const start=await f.service().begin(browser),claims=mode==='aud'?{aud:'other'}:mode==='iss'?{iss:'https://evil.example'}:mode==='exp'?{exp:999}:mode==='azp'?{azp:'other'}:{};
  const credential=await f.token(mode==='nonce'?'wrong':start.nonce,claims,mode==='signature'?other.privateKey:undefined);
  await assert.rejects(()=>f.service().complete(browser,{id:start.id,credential}));
 }
});
test('cross-browser, inactive membership, expired challenges and account remapping fail closed',async t=>{
 const f=await fixture(t),start=await f.service().begin(browser),credential=await f.token(start.nonce);
 await assert.rejects(()=>f.service().complete('x'.repeat(43),{id:start.id,credential}),/challenge_rejected/);
 const fresh=await f.service().begin(browser),session=await f.service().complete(browser,{id:fresh.id,credential:await f.token(fresh.nonce)});
 f.remap();assert.equal(await f.service().resolveEnrollmentIdentity(session.sessionHandle),null);
 f.disable();const inactive=await f.service().begin(browser);await assert.rejects(async()=>f.service().complete(browser,{id:inactive.id,credential:await f.token(inactive.nonce)}),/existing_member_required/);
 const expired=await f.service().begin(browser);f.advance();await assert.rejects(()=>f.service().complete(browser,{id:expired.id,credential}),/challenge_rejected/);
});
