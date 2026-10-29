import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesSessionAdapter} from '../../server/neo-bots/ces-session-adapter.mjs';
import {resolveCesIdentity} from '../../server/neo-bots/bank-bot.mjs';
import {createNeoBotsDeploymentRuntime, neoBotsDeploymentHealth} from '../../server/neo-bots/deployment-runtime.mjs';
import {createCesBotReportAdapter} from './ces-bot-report-adapter.mjs';

const ORIGIN='https://www.community-exchange.org';
const fakeSecret='SYNTHETIC_TEST_PASSWORD_DO_NOT_USE';
function fixtureResponse(body,{status=200,location=null,path='/login.asp'}={}) {
  const headers=new Headers({'content-type':'text/html; charset=utf-8'});
  if(location)headers.set('location',location);
  const response=new Response(body,{status,headers});
  Object.defineProperty(response,'url',{value:ORIGIN+path});
  return response;
}
function buildFixture({invalidRedirect=false,reportLogin=false}={}){
  const requests=[],audit=[];
  const fetchImpl=async (url,options={})=>{
    const path=new URL(url).pathname, method=options.method||'GET';
    requests.push({path,method,redirect:options.redirect||'unknown'});
    if (path==='/login.asp'&&method==='GET') {
      return fixtureResponse('<form method="post" action="/login.asp"><input name="account"><input type="password" name="password"></form>');
    }
    if (path==='/login.asp'&&method==='POST') {
      // Only this authentication POST is permitted in the fixture. It is not
      // a transaction, posting, issuance, settlement or bank service.
      return fixtureResponse('',{status:302,location:invalidRedirect?'/login.asp':'/win/home.asp'});
    }
    if(path==='/_admin/reptrades.asp'&&method==='GET') {
      return fixtureResponse(reportLogin?'<input type="password" name="password">':
        '<h1>Transactions Report</h1><table><tr><td>PRIVATE_MEMBER_FIXTURE</td></tr></table>',{path});
    }
    throw new Error('Unexpected request in fixture');
  };
  const sessionAdapter=createCesSessionAdapter({
    fetchImpl,
    credentialProvider:async(exchange)=>({
      username:exchange.adminAccount,
      password:fakeSecret,
      loginPath:'/login.asp',submitPath:'/login.asp',
      usernameField:'account',passwordField:'password',
      successLocationPattern:'^/win/home[.]asp$',
    }),
  });
  const sessionProvider=async ({exchangeId,purpose})=>{
    assert.equal(purpose,'report-read-only');
    return sessionAdapter.createVerifiedReportSession(resolveCesIdentity(exchangeId));
  };
  const cesAdapter=createCesBotReportAdapter({sessionProvider,onAudit:async event=>{audit.push(event)}});
  const runtime=createNeoBotsDeploymentRuntime({cesAdapter});
  return {runtime,requests,audit,sessionProvider};
}

test('whole NEO Bank Bot path reads only CES report metadata after independently validated test login',async()=>{
  const {runtime,requests,audit}=buildFixture();
  const result=await runtime.execute('neo-bank-bot',{
    action:'ces.transactions.review',risk:'read-only',exchangeId:'NMNI',
    payload:{transactionId:'no-disclosure',path:'/_admin/tx.asp'},
  });
  assert.equal(result.status,'completed');
  assert.equal(result.result.mode,'authenticated-readonly-report-evidence');
  assert.equal(result.result.ledgerRowsParsed,0);
  assert.equal(result.result.bankingRecordsWritten,0);
  assert.equal(result.result.rawReportStored,false);
  assert.equal(result.result.valueMovementAuthorized,false);
  assert.deepEqual(requests.map(x=>[x.method,x.path]),[
    ['GET','/login.asp'],['POST','/login.asp'],['GET','/_admin/reptrades.asp']
  ]);
  assert.equal(requests.every(x=>x.redirect==='manual'),true);
  assert.equal(audit.length,1);
  assert.doesNotMatch(JSON.stringify({result:result.result,audit,requests}),/PRIVATE_MEMBER_FIXTURE|SYNTHETIC_TEST_PASSWORD|no-disclosure/);
  assert.equal(neoBotsDeploymentHealth({}).liveCesExecutionEnabled,false);
});

test('failed login marker and report redirect prevent any success or audit event',async()=>{
  const {runtime,requests,audit}=buildFixture({invalidRedirect:true});
  await assert.rejects(()=>runtime.execute('neo-bank-bot',{
    action:'ces.transactions.review',risk:'read-only',exchangeId:'NMNI',payload:{}
  }),/did not validate an authenticated session/);
  assert.deepEqual(requests.map(x=>x.path),['/login.asp','/login.asp']);
  assert.deepEqual(audit,[]);
});

test('report login-form response cannot be mistaken for financial report',async()=>{
 const {runtime,audit}=buildFixture({reportLogin:true});
 await assert.rejects(()=>runtime.execute('neo-bank-bot',{
  action:'ces.transactions.review',risk:'read-only',exchangeId:'NMNI',payload:{}
 }),/resolved to a login page/);
 assert.equal(audit.length,0);
});

test('session broker blocks arbitrary routes, credentials in URL and write methods',async()=>{
 const {sessionProvider}=buildFixture();
 const session=await sessionProvider({exchangeId:'NMNI',purpose:'report-read-only'});
 for (const path of [
  '/_admin/tx.asp',
  '/_admin/reptrades.asp?uid=demo&pw=demo',
  'https://wrong-origin.test/_admin/reptrades.asp',
 ])await assert.rejects(()=>session.get(path,{method:'GET',redirect:'manual'}));
 await assert.rejects(()=>session.get('/_admin/reptrades.asp',{method:'POST',redirect:'manual'}));
 await assert.rejects(()=>session.get('/_admin/reptrades.asp',{method:'GET',redirect:'follow'}));
});
