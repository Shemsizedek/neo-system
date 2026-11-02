import test from 'node:test';
import assert from 'node:assert/strict';
import {probeCesMobileMemberLogin,runCesMobileLoginPreflight} from './ces-mobile-login-preflight.mjs';
const env={NEO_CES_NMNI_USERNAME:'NMNI0000',NEO_CES_NMNI_PASSWORD:'test-credential-not-a-real-password'};
const loginHtml='<form action="rlogin.php" method="POST" id="enter"><input name="uid"><input type="password" name="passwd"><input type="hidden" name="by" value="usr"><button name="action" value="login" type="submit">Sign In</button></form>';
const redirect=()=>new Response('',{status:302,headers:{location:'/index.php','set-cookie':'session=fixture-cookie; Path=/; HttpOnly; Secure'}});
const protectedHtml='<h1>NMNI0000 account overview</h1><nav><a href="logout.php">Log out</a></nav>';
function fakeFlow(protectedText=protectedHtml){
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    const path=new URL(url).pathname,method=options.method||'GET';
    calls.push({path,method,cookie:options.headers?.cookie||''});
    if(calls.length===1)return new Response(loginHtml,{status:200});
    if(calls.length===2){assert.equal(path,'/rlogin.php');assert.equal(method,'POST');
      const p=new URLSearchParams(options.body);
      assert.deepEqual([...p.keys()],['uid','passwd','by','timezone','action']);
      assert.equal(p.get('uid'),'NMNI0000');
      assert.equal(p.get('passwd'),env.NEO_CES_NMNI_PASSWORD);
      assert.equal(p.get('by'),'usr');
      assert.equal(p.get('action'),'login');
      return redirect();
    }
    if(calls.length===3){assert.equal(path,'/index.php');assert.equal(method,'GET');assert.match(options.headers.cookie,/session=fixture-cookie/);
      return new Response(protectedText,{status:200});
    }
    throw Error('unexpected-extra-request');
  };
  return {calls,fetchImpl};
}
test('mobile login accepts exact NMNI0000 protected-session evidence; never reports admin authority',async()=>{
 const v=fakeFlow();
 const result=await probeCesMobileMemberLogin({env,fetchImpl:v.fetchImpl});
 assert.deepEqual(result,{result:'member_session_verified',memberAuthenticated:true,adminAuthenticated:false});
 assert.equal(v.calls.length,3);
 assert.doesNotMatch(JSON.stringify({calls:v.calls,result}),/test-credential-not-a-real-password/);
});
test('login redirect alone is not authentication; requires bound account and sign-out marker',async()=>{
 for(const text of ['<h1>Welcome</h1>','<h1>NMNI0000</h1>','<a href="logout.php">Log out</a>',
  '<h1>NMNI0000</h1><a href="logout.php">Log out</a>'+loginHtml]){
  const f=fakeFlow(text);
  const result=await probeCesMobileMemberLogin({env,fetchImpl:f.fetchImpl});
  assert.equal(result.result,'member_session_unverified');
  assert.equal(result.adminAuthenticated,false);
 }
});
test('missing username/password does not touch mobile CES',async()=>{
 let called=0;
 const result=await probeCesMobileMemberLogin({env:{NEO_CES_NMNI_USERNAME:'NMNI0000'},fetchImpl:async()=>{called++;throw Error('should not call')}});
 assert.equal(result.result,'credential_configuration_unverified');
 assert.equal(called,0);
});
test('Cloudflare 403/429 and unverified mobile form stop before POST',async()=>{
 for(const httpStatus of [401,403,429]){
  const calls=[];
  const result=await probeCesMobileMemberLogin({env,fetchImpl:async(url,options)=>{calls.push(options.method);return new Response('',{status:httpStatus})}});
  assert.equal(result.result,'upstream_access_denied');
  assert.equal(result.httpStatus,httpStatus);
  assert.deepEqual(calls,['GET']);
 }
 let calls=0;
 const unverified=await probeCesMobileMemberLogin({env,fetchImpl:async()=>{calls++;return new Response('<form action="evil.php">',{status:200})}});
 assert.equal(unverified.result,'unverified_mobile_form');assert.equal(calls,1);
});
test('cross-host login redirects are blocked before cookie transfer',async()=>{
 let calls=0;
 const result=await probeCesMobileMemberLogin({env,fetchImpl:async()=>{
  calls++;
  if(calls===1)return new Response(loginHtml,{status:200});
  return new Response('',{status:302,headers:{location:'https://example.net/collect'}});
 }});
 assert.equal(result.result,'unverified_redirect');
 assert.equal(calls,2);
});
test('preflight log is categorical and does not include credentials or HTML',async()=>{
 const f=fakeFlow();
 const logs=[];
 await runCesMobileLoginPreflight({env,fetchImpl:f.fetchImpl,logger:x=>logs.push(x)});
 assert.deepEqual(logs,[{event:'ces_nmni_mobile_preflight',result:'member_session_verified',memberAuthenticated:true,adminAuthenticated:false}]);
 assert.doesNotMatch(JSON.stringify(logs),/password|cookie|credential|session=fixture-cookie/);
});

test('changed mobile form missing required Sign In action never submits credentials',async()=>{
 let calls=0;
 const suspicious=loginHtml.replace(/<button[^>]*>Sign In<\/button>/,'');
 const result=await probeCesMobileMemberLogin({env,fetchImpl:async()=>{
   calls++; return new Response(suspicious,{status:200});
 }});
 assert.equal(result.result,'unverified_mobile_form');
 assert.equal(calls,1);
});
