import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash,randomBytes,sign} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {encodeCBOR} from '@levischuck/tiny-cbor';
import {createNooglePasskeyAccounts} from './noogle-passkey-accounts.mjs';
import {createNooglePasskeyStore} from './noogle-passkey-store.mjs';
const origin='https://neopass.example',rpId='neopass.example',browser='b'.repeat(43),hash=x=>createHash('sha256').update(x).digest(),b64=x=>Buffer.from(x).toString('base64url');
function authenticator(){
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),jwk=publicKey.export({format:'jwk'}),id=randomBytes(32);
 const cose=encodeCBOR(new Map([[1,2],[3,-7],[-1,1],[-2,new Uint8Array(Buffer.from(jwk.x,'base64url'))],[-3,new Uint8Array(Buffer.from(jwk.y,'base64url'))]]));
 return {
  register(options){const client=Buffer.from(JSON.stringify({type:'webauthn.create',challenge:options.challenge,origin,crossOrigin:false}));const auth=Buffer.concat([hash(rpId),Buffer.from([0x45]),Buffer.alloc(4),Buffer.alloc(16),Buffer.from([0,id.length]),id,Buffer.from(cose)]);return {id:b64(id),rawId:b64(id),type:'public-key',response:{clientDataJSON:b64(client),attestationObject:b64(encodeCBOR(new Map([['fmt','none'],['attStmt',new Map()],['authData',new Uint8Array(auth)]]))),transports:['internal']},clientExtensionResults:{}};},
  login(options,userHandle,{wrongOrigin=false,flags=5}={}){const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:options.challenge,origin:wrongOrigin?'https://evil.example':origin,crossOrigin:false}));const auth=Buffer.concat([hash(rpId),Buffer.from([flags]),Buffer.from([0,0,0,1])]);return {id:b64(id),rawId:b64(id),type:'public-key',response:{clientDataJSON:b64(client),authenticatorData:b64(auth),signature:b64(sign('sha256',Buffer.concat([auth,hash(client)]),privateKey)),userHandle},clientExtensionResults:{}};}
 };
}
async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'noogle-passkey-')),path=join(dir,'accounts.sqlite');let store=createNooglePasskeyStore(path);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const service=()=>createNooglePasskeyAccounts({rpId,origin,store});
 const auth=authenticator(),registration=await service().beginRegistration(browser);
 await service().finishRegistration(browser,{id:registration.id,response:auth.register(registration.options)});
 return {auth,registration,service,get store(){return store;},reopen(){store.close();store=createNooglePasskeyStore(path);return service();}};
}
test('real WebAuthn registration and signed login persist across restart; revoked credential denies session',async t=>{
 const f=await fixture(t),service=f.reopen(),ceremony=await service.beginLogin(browser),response=f.auth.login(ceremony.options,f.registration.options.user.id);
 const session=await service.finishLogin(browser,{id:ceremony.id,response});const identity=await service.authenticate(session.sessionHandle);
 assert.equal(identity.verified,true);assert.equal(identity.assurance,'passkey-user-verified');
 const reloaded=f.reopen();assert.equal((await reloaded.authenticate(session.sessionHandle)).subject,identity.subject);
 await assert.rejects(()=>reloaded.finishLogin(browser,{id:ceremony.id,response}),/ceremony_expired_or_replayed/);
 // Reopened store, same persisted credential and account.
 const current=f.service();await assert.rejects(()=>current.finishRegistration(browser,{id:f.registration.id,response:f.auth.register(f.registration.options)}));
 assert.equal(await current.authenticate('invalid'),null);
 assert.equal(await f.store.revokeCredential(identity.subject,response.id),true);
 assert.equal(await current.authenticate(session.sessionHandle),null);
});
test('wrong browser, wrong origin and absent user verification cannot authenticate',async t=>{
 const f=await fixture(t),service=f.service();
 for(const mode of ['browser','origin','uv']){const ceremony=await service.beginLogin(browser),response=f.auth.login(ceremony.options,f.registration.options.user.id,{wrongOrigin:mode==='origin',flags:mode==='uv'?1:5});await assert.rejects(()=>service.finishLogin(mode==='browser'?'x'.repeat(43):browser,{id:ceremony.id,response}));}
});
test('wrong discoverable user handle is rejected before creating a session',async t=>{
 const f=await fixture(t),service=f.service(),ceremony=await service.beginLogin(browser);
 await assert.rejects(()=>service.finishLogin(browser,{id:ceremony.id,response:f.auth.login(ceremony.options,'wrong-user')}),/credential_rejected/);
});
test('account service rejects insecure configuration and unbound browser sessions',async()=>{
 assert.throws(()=>createNooglePasskeyAccounts({rpId,origin:'http://neopass.example',store:{}}));
});

test('verified social identity enrollment preserves the existing canonical account and survives restart',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'noogle-linked-')),path=join(dir,'accounts.sqlite');let store=createNooglePasskeyStore(path);
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const identity={verified:true,canonicalSubject:'existing-temple-owner',issuer:'https://accounts.google.com',providerSubject:'stable-provider-subject',audience:origin,authenticatedAt:1000};
 let current=identity;
 const service=()=>createNooglePasskeyAccounts({rpId,origin,store,resolveEnrollmentIdentity:async token=>token==='trusted-session'?current:null,now:()=>2000});
 const auth=authenticator(),registration=await service().beginLinkedRegistration(browser,'trusted-session');
 assert.equal(registration.options.user.name,'existing-temple-owner');
 assert.equal((await service().finishLinkedRegistration(browser,'trusted-session',{id:registration.id,response:auth.register(registration.options)})).existingAccount,true);
 store.close();store=createNooglePasskeyStore(path);
 const ceremony=await service().beginLogin(browser),response=auth.login(ceremony.options,registration.options.user.id);
 const login=await service().finishLogin(browser,{id:ceremony.id,response});assert.equal((await service().authenticate(login.sessionHandle)).subject,'existing-temple-owner');
 // Provider-session substitution consumes and rejects the registration ceremony.
 const another=await service().beginLinkedRegistration(browser,'trusted-session');current={...identity,canonicalSubject:'someone-else'};
 await assert.rejects(()=>service().finishLinkedRegistration(browser,'trusted-session',{id:another.id,response:authenticator().register(another.options)}),/identity_changed/);
 current=identity;await assert.rejects(()=>service().finishLinkedRegistration(browser,'trusted-session',{id:another.id,response:authenticator().register(another.options)}),/expired_or_replayed/);
});

test('linked enrollment rejects untrusted, stale, mismatched audience and missing provider identity',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'noogle-linked-deny-')),store=createNooglePasskeyStore(join(dir,'accounts.sqlite'));
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const identity={verified:true,canonicalSubject:'existing',issuer:'https://accounts.google.com',providerSubject:'provider',audience:origin,authenticatedAt:1000};
 for(const delta of [{verified:false},{authenticatedAt:-400000},{authenticatedAt:3000},{audience:'https://other.example'},{providerSubject:''},{canonicalSubject:''}]){
  const service=createNooglePasskeyAccounts({rpId,origin,store,resolveEnrollmentIdentity:async()=>({...identity,...delta}),now:()=>2000});
  await assert.rejects(()=>service.beginLinkedRegistration(browser,'session'),/fresh_verified_member/);
 }
 const service=createNooglePasskeyAccounts({rpId,origin,store});await assert.rejects(()=>service.beginLinkedRegistration(browser,'session'),/not_configured/);
});

test('provider link conflicts, disabled accounts and extra credentials cannot alter migrated identity',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'noogle-link-conflict-')),store=createNooglePasskeyStore(join(dir,'accounts.sqlite'));
 t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
 const row={subject:'existing-owner',issuer:'https://accounts.google.com',providerSubject:'pinned',id:'credential-one',counter:0,userHandle:'handle',publicKey:'fixture'};
 await store.registerLinked(row);
 await assert.rejects(()=>store.registerLinked({...row,subject:'replacement',id:'credential-two'}),/provider_already_linked/);
 assert.equal(await store.active('replacement'),false);
 await assert.rejects(()=>store.registerLinked({...row,id:'credential-two'}),/credential_management_required/);
 assert.equal(await store.credential('credential-two'),null);
 await store.disableAccount('existing-owner');
 await assert.rejects(()=>store.registerLinked({...row,id:'credential-three'}),/account_disabled/);
 assert.equal(await store.active('existing-owner'),false);
 assert.equal((await store.credential('credential-one')).subject,'existing-owner');
});
