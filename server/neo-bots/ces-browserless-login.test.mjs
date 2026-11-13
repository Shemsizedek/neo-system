import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesSessionAdapter} from './ces-session-adapter.mjs';
import {createNmniReadCredentialProvider} from './nmni-login-profile.mjs';
import {resolveCesIdentity} from './bank-bot.mjs';

test('CES server can authenticate repeatedly without browser cookies',async()=>{
 const attempts=[],env={
   NEO_CES_NMNI_USERNAME:'fixture-admin',
   NEO_CES_NMNI_PASSWORD:'fixture-credential'
 };
 const adapter=createCesSessionAdapter({
   credentialProvider:createNmniReadCredentialProvider(env),
   sessionValidator:async()=>({authenticated:true,reason:'verified-fixture'}),
   fetchImpl:async(url,options={})=>{
     const method=options.method||'GET';
     const path=new URL(url).pathname;
     attempts.push({path,method});
     if(path==='/login.asp'&&method==='GET')
       return new Response('<form method="POST" action="/rlogin.asp"><input name="uid"><input name="passwd" type="password"></form>',{status:200});
     if(path==='/rlogin.asp'&&method==='POST'){
       assert.match(String(options.body),/uid=fixture-admin/);
       assert.match(String(options.body),/passwd=fixture-credential/);
       return new Response('',{status:200});
     }
     throw new Error('unexpected CES route');
   }
 });
 const one=await adapter.login(resolveCesIdentity('NMNI'));
 const two=await adapter.login(resolveCesIdentity('NMNI'));
 assert.equal(one.authenticated,true);
 assert.equal(two.authenticated,true);
 assert.deepEqual(attempts,[
   {path:'/login.asp',method:'GET'},{path:'/rlogin.asp',method:'POST'},
   {path:'/login.asp',method:'GET'},{path:'/rlogin.asp',method:'POST'}
 ]);
 assert.doesNotMatch(JSON.stringify([one,two]),/fixture-credential|fixture-admin/);
});
