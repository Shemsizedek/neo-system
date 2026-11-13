import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createNoogleNeopassProvider} from './noogle-neopass-provider.mjs';
const verifier='a'.repeat(43),challenge=createHash('sha256').update(verifier).digest('base64url');
const input={client_id:'community',redirect_uri:'https://community.example/callback',response_type:'code',scope:'openid',state:'s'.repeat(43),nonce:'n'.repeat(43),code_challenge:challenge,code_challenge_method:'S256'};
function fixture(overrides={}){
 const records=new Map();let clock=1000;
 const provider=createNoogleNeopassProvider({clients:[{id:'community',name:'Community',redirects:[input.redirect_uri]},{id:'other',name:'Other',redirects:['https://other.example/callback']}],store:{async issue(key,value){records.set(key,value);},async take(key){const row=records.get(key);records.delete(key);return row;}},authenticate:async session=>session==='valid'?{subject:'member',verified:true}:null,approve:async()=>true,isActive:async()=>true,pairwiseSecret:'fixture-secret-never-use-in-production',now:()=>clock,...overrides});
 const code=async()=>new URL((await provider.authorize(input,'valid')).redirect).searchParams.get('code');
 return {provider,code,records,expire:()=>{clock+=120001;}};
}
test('registered consented client receives single-use PKCE grant and pairwise subject',async()=>{
 const f=fixture(),code=await f.code(),args={code,client_id:input.client_id,redirect_uri:input.redirect_uri,code_verifier:verifier};
 const grant=await f.provider.redeem(args);assert.equal(grant.audience,'community');assert.notEqual(grant.subject,'member');assert.equal(grant.nonce,input.nonce);assert.equal(grant.tokenIssuanceRequired,true);assert.equal(JSON.stringify(grant).includes('address'),false);
 await assert.rejects(()=>f.provider.redeem(args),/invalid_grant/);
});
test('rejects wildcard/unknown callbacks, unsupported scopes and absent authentication',async()=>{
 const f=fixture();for(const delta of [{redirect_uri:'https://community.example/evil'},{client_id:'unknown'},{scope:'openid wallet'},{code_challenge_method:'plain'},{state:'short'}])await assert.rejects(()=>f.provider.authorize({...input,...delta},'valid'));
 await assert.rejects(()=>f.provider.authorize(input,'invalid'),/authentication_required/);
});
test('requires server-controlled consent and active identity',async()=>{
 await assert.rejects(()=>fixture({approve:async()=>false}).code(),/consent_required/);
 await assert.rejects(()=>fixture({isActive:async()=>false}).code(),/identity_inactive/);
});
test('wrong verifier consumes grant; expiry and client substitution are denied',async()=>{
 for(const mode of ['pkce','expiry','client']){
  const f=fixture(),code=await f.code();if(mode==='expiry')f.expire();
  await assert.rejects(()=>f.provider.redeem({code,client_id:mode==='client'?'other':'community',redirect_uri:mode==='client'?'https://other.example/callback':input.redirect_uri,code_verifier:mode==='pkce'?'b'.repeat(43):verifier}),/invalid_grant/);
 }
});
test('parallel exchanges cannot redeem one code twice',async()=>{
 const f=fixture(),args={code:await f.code(),client_id:'community',redirect_uri:input.redirect_uri,code_verifier:verifier};
 const results=await Promise.allSettled([f.provider.redeem(args),f.provider.redeem(args)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
});
