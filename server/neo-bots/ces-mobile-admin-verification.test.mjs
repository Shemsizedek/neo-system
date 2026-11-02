import test from 'node:test';
import assert from 'node:assert/strict';
import {probeCesMobileMemberLogin,runCesMobileLoginPreflight,inspectCesMobileAdminPage}
 from './ces-mobile-login-preflight.mjs';

const env={
  NEO_CES_NMNI_USERNAME:'NMNI0000',
  NEO_CES_NMNI_PASSWORD:'fixture-not-a-real-password',
  NEO_CES_MOBILE_ADMIN_PREFLIGHT_ON_START:'true'
};
const login='<form action="rlogin.php" method="POST"><input name="uid"><input name="passwd"><input name="by" value="usr"><button name="action" value="login">Sign In</button></form>';
const adminLink='<a href="/admin.php">Administration</a>';
const signedIn=link=>'<main>Account: NMNI0000 <a href="logout.php">Log Out</a> '+link+'</main>';
const verifiedAdmin='<h1>Administration</h1> Hon. Larry Shelton | Noocratic Open Market Nibiru Index <a href="logout.php">Log Out</a><a href="newlist.php">Approve new sign-ups (0)</a><a href="editexchange.php">Manage exchange</a><a href="transactionreport.php">Transaction report</a><a href="manage.php?go=ss">Send statements</a>';

const mkFlow=(nav=adminLink,adminBody=verifiedAdmin)=>{
 const calls=[];
 const fetchImpl=async(url,options={})=>{
   const path=new URL(url).pathname,method=options.method||'GET';
   calls.push({path,method,hasCookie:Boolean(options.headers?.cookie)});
   if(calls.length===1)return new Response(login,{status:200});
   if(calls.length===2){
     assert.equal(path,'/rlogin.php');assert.equal(method,'POST');
     assert.equal(new URLSearchParams(options.body).get('action'),'login');
     return new Response('',{status:302,headers:{location:'/index.php', 'set-cookie':'session=sample-no-storage; HttpOnly'}});
   }
   if(calls.length===3){
     assert.equal(path,'/index.php');assert.equal(options.headers.cookie,'session=sample-no-storage');
     return new Response(signedIn(nav),{status:200});
   }
   if(calls.length===4){
     assert.equal(path,nav.includes('Administration')?'/admin.php':'/manage.php');assert.equal(method,'GET');
     assert.equal(options.headers.cookie,'session=sample-no-storage');
     return new Response(adminBody,{status:200});
   }
   throw new Error('unexpected extra request');
 };
 return {calls,fetchImpl};
};

test('verified mobile principal can inspect a discovered, same-origin, GET-only administration page',async()=>{
 const flow=mkFlow();
 const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,inspectAdministration:true});
 assert.deepEqual(result,{result:'member_session_verified',memberAuthenticated:true,adminAuthenticated:true,
   adminVerification:{navigationVisible:true,protectedPageVerified:true}});
 assert.deepEqual(flow.calls.map(x=>[x.path,x.method]),
  [['/index.php','GET'],['/rlogin.php','POST'],['/index.php','GET'],['/admin.php','GET']]);
 assert.doesNotMatch(JSON.stringify({result,calls:flow.calls}),/fixture-not-a-real-password|sample-no-storage/);
});

test('admin menu alone never proves administrator privileges',async()=>{
 const flow=mkFlow(adminLink,'<h1>Administration</h1> Log Out');
 const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,inspectAdministration:true});
 assert.equal(result.memberAuthenticated,true);
 assert.equal(result.adminAuthenticated,false);
 assert.equal(result.adminVerification.protectedPageVerified,false);
});

test('the reviewed browser /manage.php route verifies admin rights when landing-page menu is absent',async()=>{
 const flow=mkFlow('<a href="/help.php">Help</a>');
 const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,inspectAdministration:true});
 assert.equal(result.memberAuthenticated,true);
 assert.equal(result.adminAuthenticated,true);
 assert.deepEqual(result.adminVerification,{navigationVisible:false,protectedPageVerified:true});
 assert.deepEqual(flow.calls.map(x=>[x.path,x.method]),[['/index.php','GET'],['/rlogin.php','POST'],['/index.php','GET'],['/manage.php','GET']]);
});

test('reviewed admin route does not prove anything without the protected account controls',async()=>{
 const flow=mkFlow('<a href="/help.php">Help</a>','<h1>Administration</h1> Log Out');
 const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,inspectAdministration:true});
 assert.equal(result.memberAuthenticated,true);
 assert.equal(result.adminAuthenticated,false);
 assert.equal(result.adminVerification.protectedPageVerified,false);
 assert.equal(flow.calls.length,4);
});

test('cross-origin and query-string administration links are never followed',async()=>{
 for(const link of [
  '<a href="https://attacker.test/admin.php">Administration</a>',
  '<a href="/admin.php?token=sensitive">Administration</a>',
  '<a href="/transfer.php">Administration</a>',
  '<a href="/admin.php?x=1&amp;y=2">Administration</a>'
 ]){
   const flow=mkFlow(link);
   const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,inspectAdministration:true});
   assert.equal(result.adminAuthenticated,false);
   assert.equal(result.adminVerification.navigationVisible,true);
   assert.equal(flow.calls.length,3);
 }
});

test('admin page must be tied to exact principal and include specialized protected controls',()=>{
 assert.equal(inspectCesMobileAdminPage(verifiedAdmin),true);
 assert.equal(inspectCesMobileAdminPage(verifiedAdmin.replace('Hon. Larry Shelton','Other Principal')),false);
 assert.equal(inspectCesMobileAdminPage(verifiedAdmin.replace('Noocratic Open Market Nibiru Index','Another Community')),false);
 assert.equal(inspectCesMobileAdminPage(verifiedAdmin.replace('Transaction report','Public home')),false);
 assert.equal(inspectCesMobileAdminPage(verifiedAdmin+login),false);
});

test('one-shot admin preflight reports only booleans, no cookie or page data',async()=>{
 const flow=mkFlow();
 const logs=[];
 await runCesMobileLoginPreflight({env,fetchImpl:flow.fetchImpl,logger:x=>logs.push(x)});
 assert.deepEqual(logs,[{event:'ces_nmni_mobile_preflight',result:'member_session_verified',
   memberAuthenticated:true,adminAuthenticated:true,
   adminVerification:{navigationVisible:true,protectedPageVerified:true}}]);
 assert.doesNotMatch(JSON.stringify(logs),/fixture-not-a-real-password|sample-no-storage|transaction report|admin.php/i);
});
