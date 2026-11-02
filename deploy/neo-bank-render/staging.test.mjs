import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {createNeoBankStagingServer} from './staging.mjs';
import {createBankSourceClient,BankSourceError} from '../../server/neo-bank/source-client.mjs';

const control='bank-control-fixture-'.repeat(3), upstream='upstream-token-fixture-'.repeat(3);
const env={NEO_BANK_SOURCE_URL:'https://private-source.example',NEO_BANK_SOURCE_TOKEN:upstream};
const headers={authorization:'Bearer '+control};
const report={id:'a'.repeat(64),observedAt:'2026-11-01T00:00:00.000Z',rowCount:1,unit:'NEO',recordType:'historical-trading-summary',columns:['Months','Month-Year','Trades','NEO','Average','Levy','Total (- Levy)','Total'],monthlyRows:[['1','July 2016','1','99999999999999999999.01','1.00','0.00','1.00','1.00']]};
async function running(options,fn){
 const server=createNeoBankStagingServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{return await fn('http://127.0.0.1:'+server.address().port)}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
test('preview hides the upstream platform and blocks financial actions',async()=>running({},async base=>{
 assert.equal((await fetch(base+'/healthz')).status,200);
 assert.equal((await fetch(base+'/health')).status,503);
 assert.equal((await fetch(base+'/api/v1/community/status')).status,503);
 for(const path of ['/api/v1/transfers','/api/v1/offers'])assert.equal((await fetch(base+path,{method:'POST',body:'{}'})).status,503);
 assert.equal((await (await fetch(base+'/api/v1/auth/config')).json()).enabled,false);
 for(const path of ['/api/v1/ces/exchanges','/api/v1/ces/bridge/status'])assert.equal((await fetch(base+path)).status,404);
 const response=await fetch(base);
 const page=await response.text();
 assert.match(page,/NEO Bank \| Community Finance/);
 assert.match(page,/data-section="overview"/);
 assert.match(page,/data-open="accounts"/);
 assert.match(page,/id="runtimeStatus"/);
 assert.match(page,/Staging interface/);
 assert.doesNotMatch(page,/\bCES\b|community-exchange|NMNI|private-source|SOURCE_TOKEN|name="toAccount"/i);
 const policy=response.headers.get('content-security-policy')||'';
 assert.match(policy,/script-src 'self'/);
 assert.match(policy,/form-action 'none'/);
 for(const asset of ['/preview.css','/preview.js']){
  const r=await fetch(base+asset);assert.equal(r.status,200);
  const text=await r.text();assert.ok(text.length>300);
  assert.match(r.headers.get('content-type'),asset.endsWith('css')?/text\/css/:/javascript/);
  if(asset.endsWith('js')){
   assert.match(text,/showSection/);
   assert.match(text,/fetchStatus/);
   assert.doesNotMatch(text,/\/api\/v1\/transfers|\/api\/v1\/auth\/google|localStorage|sessionStorage/);
  }
 }

}));
test('source controls reject unauthenticated browsers, origins, input and write actions',async()=>running({sourceControlToken:control,sourceClient:{status:async()=>({configured:true})}},async base=>{
 assert.equal((await fetch(base+'/internal/v1/data-source/status')).status,401);
 assert.equal((await fetch(base+'/internal/v1/data-source/status',{headers:{...headers,origin:'https://neobank.holytemples.org'}})).status,403);
 assert.equal((await fetch(base+'/internal/v1/data-source/auth/check',{method:'POST',headers,body:'{}'})).status,400);
 assert.equal((await fetch(base+'/internal/v1/data-source/status?url=https://evil.example',{headers})).status,400);
 assert.equal((await fetch(base+'/internal/v1/data-source/transfer',{method:'POST',headers})).status,404);
}));
test('bank uses server credentials and fixed routes without forwarding browser sessions',async()=>{
 const calls=[];
 const client=createBankSourceClient({env,fetchImpl:async(url,options)=>{
  calls.push([url,options]);assert.equal(options.redirect,'manual');assert.equal(options.headers.authorization,'Bearer '+upstream);assert.equal(options.headers.cookie,undefined);
  const path=new URL(url).pathname;
  if(path==='/v1/status')return Response.json({exchangeId:'NMNI',credentialsConfigured:true,password:'never-return',loginProfile:{submitPath:'private'}});
  if(path==='/v1/auth/check')return Response.json({proof:{exchangeId:'NMNI',memberAuthenticated:true,adminAuthenticated:true,verifiedAt:report.observedAt},cookie:'never-return'});
  if(path==='/v1/reports/trading/latest')return Response.json({report:{...report,password:'never-return',sourceOrigin:'https://private-source.example'}});
  throw Error('unexpected route');
 }});
 await running({sourceClient:client,sourceControlToken:control},async base=>{
  const state=await (await fetch(base+'/internal/v1/data-source/status',{headers:{...headers,cookie:'customer-session=private'}})).json();
  assert.equal(state.runtimeReachable,true);assert.equal(state.authenticationVerified,false);
  const auth=await (await fetch(base+'/internal/v1/data-source/auth/check',{method:'POST',headers})).json();assert.equal(auth.authenticated,true);
  const data=await (await fetch(base+'/internal/v1/data-source/report',{headers})).json();assert.equal(data.report.monthlyRows[0][3],'99999999999999999999.01');
  assert.doesNotMatch(JSON.stringify([state,auth,data]),/never-return|NMNI|community-exchange|private-source|upstream-token|bank-control|loginProfile/);
 });
 assert.deepEqual(calls.map(([url,options])=>[new URL(url).pathname,options.method]),[['/v1/status','GET'],['/v1/auth/check','POST'],['/v1/reports/trading/latest','GET']]);
});
test('bank fails closed on unconfigured sources, redirects, malformed and oversized data',async()=>{
 for(const url of ['http://private-source.example','https://user:password@private-source.example','https://private-source.example/?token=x']){
  const client=createBankSourceClient({env:{...env,NEO_BANK_SOURCE_URL:url},fetchImpl:()=>{throw Error('must not request')}});
  assert.equal(client.configured,false);await assert.rejects(()=>client.verify(),/source_not_configured/);
 }
 for(const fake of [
  async()=>new Response('',{status:302,headers:{location:'https://evil.example'}}),
  async()=>new Response('not JSON'),
  async()=>Response.json({padding:'x'.repeat(270000)}),
  async()=>{throw Error('private-source.example pw=secret cookie=private')},
 ]){
  const client=createBankSourceClient({env,fetchImpl:fake});
  await assert.rejects(()=>client.status(),error=>error instanceof BankSourceError&&!/secret|cookie=|private-source/.test(error.message));
 }
 const malformed=createBankSourceClient({env,fetchImpl:async()=>Response.json({report:{...report,monthlyRows:[['secret']]}})});
 await assert.rejects(()=>malformed.report(),/source_invalid_response/);
});
test('missing reports and denied logins remain explicit without leaking upstream errors',async()=>{
 const client=createBankSourceClient({env,fetchImpl:async url=>new URL(url).pathname.endsWith('/latest')?Response.json({secret:'hidden'},{status:404}):Response.json({error:'pw=secret https://private-source.example',diagnostic:{httpStatus:403}},{status:502})});
 await running({sourceClient:client,sourceControlToken:control},async base=>{
  const auth=await fetch(base+'/internal/v1/data-source/auth/check',{method:'POST',headers});assert.equal(auth.status,502);assert.deepEqual(await auth.json(),{error:'source_login_blocked'});
  const data=await fetch(base+'/internal/v1/data-source/report',{headers});assert.equal(data.status,404);assert.deepEqual(await data.json(),{error:'report_not_available'});
 });
});
test('untrusted error text never becomes a bank response',async()=>running({sourceControlToken:control,sourceClient:{status:async()=>{throw new BankSourceError('pw=secret')}}},async base=>{
 const response=await fetch(base+'/internal/v1/data-source/status',{headers});assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'source_unavailable'});
}));


test('new dashboard view is read-only without private account data or actionable money forms',async()=>running({},async base=>{
 const page=await (await fetch(base+'/index.html')).text();
 for(const key of ['overview','accounts','exchange','markets','activity','integrations']){
  assert.match(page,new RegExp('data-view="'+key+'"'));
 }
 assert.match(page,/Transfers are not available/);
 assert.match(page,/No live listings connected/);
 assert.match(page,/No verified statement available/);
 assert.match(page,/No connected account or financial balance/);
 assert.doesNotMatch(page,/id="transferForm"|id="offerForm"|id="googleButton"|\bNMNIBANK\b|seed phrase.*input/i);
 for(const path of ['/api/v1/transfers','/api/v1/offers','/api/v1/auth/google']){
  assert.equal((await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,503);
 }
}));
