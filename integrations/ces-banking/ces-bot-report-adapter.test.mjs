import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesBotReportAdapter} from './ces-bot-report-adapter.mjs';
import {createNeoBotsDeploymentRuntime} from '../../server/neo-bots/deployment-runtime.mjs';

function makeResponse(path,{status=200,html='<h1>Transaction Report</h1><table><tr><td>private member account data</td></tr></table>',url='https://www.community-exchange.org'+path}={}){
 return {
   status,url,headers:new Headers({'content-type':'text/html; charset=utf-8'}),
   async text(){return html},
 };
}
const exchange={exchangeId:'NMNI'};
function setup(responseChanges={}){
 const calls=[],audits=[];
 const adapter=createCesBotReportAdapter({
   sessionProvider:async req=>{
     calls.push({event:'session',...req});
     return {
       exchangeId:'NMNI',authenticated:true,readOnly:true,
       get:async(path,opts)=>{calls.push({event:'get',path,...opts});return makeResponse(path,responseChanges)},
     };
   },
   onAudit:e=>audits.push(e),
 });
 return {adapter,calls,audits};
}
test('default runtime remains stub, but existing NEO Bank Bot accepts isolated read adapter injection',async()=>{
 const disabled=createNeoBotsDeploymentRuntime();
 const stub=await disabled.execute('neo-bank-bot',{action:'ces.transactions.review',risk:'read-only'});
 assert.equal(stub.result.mode,'stub');
 const {adapter,calls,audits}=setup();
 const runtime=createNeoBotsDeploymentRuntime({cesAdapter:adapter});
 const res=await runtime.execute('neo-bank-bot',{action:'ces.transactions.review',risk:'read-only',payload:{path:'https://www.community-exchange.org/_admin/tx.asp?pw=secret'}});
 assert.equal(res.status,'completed');
 assert.equal(res.result.mode,'authenticated-readonly-report-evidence');
 assert.equal(res.result.rawReportStored,false);
 assert.equal(res.result.ledgerRowsParsed,0);
 assert.equal(calls[1].method,'GET');
 assert.equal(calls[1].path,'/_admin/reptrades.asp');
 assert.equal(calls[1].redirect,'manual');
 assert.equal(audits.length,1);
 assert.doesNotMatch(JSON.stringify({result:res.result,audits,calls}),/private member|pw=secret/);
});
test('reader never returns report HTML, cookies or member records',async()=>{
 const {adapter,audits}=setup();
 const r=await adapter.readReport({exchange,report:'transactions'});
 assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.equal(r.bankingRecordsWritten,0);
 assert.equal(r.valueMovementAuthorized,false);
 assert.doesNotMatch(JSON.stringify({r,audits}),/private member account data/);
});
test('session boundaries block spoofing, login redirects, query URLs and oversized reports',async()=>{
 for(const session of [
  {exchangeId:'NMNI',authenticated:false,readOnly:true,get:async()=>{}},
  {exchangeId:'XCPC',authenticated:true,readOnly:true,get:async()=>{}},
  {exchangeId:'NMNI',authenticated:true,readOnly:false,get:async()=>{}},
 ]) {
  const adapter=createCesBotReportAdapter({sessionProvider:async()=>session,onAudit:()=>{}});
  await assert.rejects(()=>adapter.readReport({exchange}),/session unavailable/);
 }
 for(const changes of [
  {status:302},
  {url:'https://www.community-exchange.org/rlogin.asp?uid=one&pw=bogus'},
  {url:'https://notces.example/_admin/reptrades.asp'},
  {html:'<input type="password" name="password">'},
  {html:'x'.repeat(65537)},
 ]) {
  const {adapter}=setup(changes);
  await assert.rejects(()=>adapter.readReport({exchange}));
 }
});
test('all CES writes blocked even after bot approval',async()=>{
 const {adapter}=setup();
 for(const operation of ['approveTransaction','issueVDollars','uploadPublication','maintainSubscription']){
  const r=await adapter[operation]({exchange,amount:'100'});
  assert.equal(r.ok,false);
  assert.equal(r.valueMovementAuthorized,undefined);
  assert.equal(r.executable,false);
 }
});
test('only named exchanges and report names are accepted',async()=>{
 const {adapter}=setup();
 await assert.rejects(()=>adapter.readReport({exchange:{exchangeId:'BAD'},report:'transactions'}),/Unapproved/);
 await assert.rejects(()=>adapter.readReport({exchange,report:'withdrawals'}),/Unknown/);
});
