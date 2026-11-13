import test from 'node:test';
import assert from 'node:assert/strict';
import {probeCesMobileMemberLogin} from './ces-mobile-login-preflight.mjs';

const env={NEO_CES_NMNI_USERNAME:'NMNI0000',NEO_CES_NMNI_PASSWORD:'fixture-never-log'};
const login='<form action="rlogin.php" method="POST"><input name="uid"><input name="passwd"><input name="by" value="usr"><button name="action" value="login">Sign In</button></form>';
const member='NMNI0000 <a href="logout.php">Log Out</a>';
const admin=link=>'<h1>Administration</h1> Hon. Larry Shelton Noocratic Open Market Nibiru Index '+
  '<a href="logout.php">Log Out</a><a>Approve new sign-ups</a><a>Manage exchange</a>'+
  '<a>Transaction report</a><a>Send statements</a>'+link;

function makeFlow({usersLink='<a href="https://ces.community/members.php">Users</a>',
  usersStatus=200,adminValid=true}={}){
  const calls=[];
  const fetchImpl=async (url,options={})=>{
    const u=new URL(url),path=u.pathname,method=options.method||'GET';
    calls.push({path,method,hasCookie:Boolean(options.headers?.cookie)});
    if(path==='/index.php' && calls.length===1)return new Response(login,{status:200});
    if(path==='/rlogin.php' && method==='POST'){
      assert.equal(new URLSearchParams(options.body).get('action'),'login');
      return new Response('',{status:302,headers:{
        location:'/index.php','set-cookie':'session=ephemeral-only; Path=/; Secure; HttpOnly'
      }});
    }
    if(path==='/index.php' && calls.length===3)return new Response(member,{status:200});
    if(path==='/manage.php'){
      assert.equal(method,'GET');assert.equal(options.headers.cookie,'session=ephemeral-only');
      return new Response(adminValid?admin(usersLink):'<h1>Public page</h1>',{status:200});
    }
    if(path==='/members.php'){
      assert.equal(method,'GET');assert.equal(options.headers.cookie,'session=ephemeral-only');
      return usersStatus===302?new Response('',{status:302,headers:{location:'/index.php'}}):
        new Response('<h1>Users</h1> PRIVATE ACCOUNT INFORMATION NOT TO LOG',{status:usersStatus});
    }
    throw Error('unreviewed path');
  };
  return {calls,fetchImpl};
}
test('verified admin can reach reviewed Users GET route without storing account records',async()=>{
  const flow=makeFlow();
  const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,
    inspectAdministration:true,checkUsersRoute:true});
  assert.equal(result.memberAuthenticated,true);
  assert.equal(result.adminAuthenticated,true);
  assert.deepEqual(result.usersRoute,{linked:true,reached:true,accountControlVerified:false});
  assert.deepEqual(flow.calls.map(x=>[x.path,x.method]),[
    ['/index.php','GET'],['/rlogin.php','POST'],['/index.php','GET'],
    ['/manage.php','GET'],['/members.php','GET']
  ]);
  assert.doesNotMatch(JSON.stringify({result,calls:flow.calls}),/ephemeral-only|PRIVATE ACCOUNT|fixture-never-log/);
});
test('missing or unsafe Users link blocks any Users-page request',async()=>{
  for(const link of [
    '<a href="https://other.example/members.php">Users</a>',
    '<a href="/members.php?token=secret">Users</a>',
    '<a href="/members.php">Other</a>',
    ''
  ]){
    const flow=makeFlow({usersLink:link});
    const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,
      inspectAdministration:true,checkUsersRoute:true});
    assert.deepEqual(result.usersRoute,{linked:false,reached:false,accountControlVerified:false});
    assert.equal(flow.calls.length,4);
  }
});
test('admin rights must be verified before Users is requested',async()=>{
  const flow=makeFlow({adminValid:false});
  const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,
    inspectAdministration:true,checkUsersRoute:true});
  assert.equal(result.adminAuthenticated,false);
  assert.equal(result.usersRoute,undefined);
  assert.equal(flow.calls.length,4);
});
test('CES redirect to login does not prove Users route access or account ownership',async()=>{
  const flow=makeFlow({usersStatus:302});
  const result=await probeCesMobileMemberLogin({env,fetchImpl:flow.fetchImpl,
    inspectAdministration:true,checkUsersRoute:true});
  assert.deepEqual(result.usersRoute,{linked:true,reached:false,accountControlVerified:false});
  assert.equal(flow.calls.length,5);
});
