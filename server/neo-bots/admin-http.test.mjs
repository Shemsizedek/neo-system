import test from 'node:test';
import assert from 'node:assert/strict';
import { BotRegistry, AuditLedger, NeoBotRuntime } from './runtime.mjs';
import { createNeoBotsAdminHttpHandler } from './admin-http.mjs';

function runtimeWithPending(){
  const registry=new BotRegistry([{id:'neo-bank-bot',name:'NEO Bank Bot',type:'financial',status:'active',scopes:['ces.transactions.approve'],requiresHumanApproval:true}]);
  const runtime=new NeoBotRuntime({registry,audit:new AuditLedger()});
  runtime.attach('neo-bank-bot',async()=>({ok:true}));
  return runtime;
}

test('approval HTTP surface rejects missing bearer token',async()=>{
  const runtime=runtimeWithPending();
  const handler=createNeoBotsAdminHttpHandler({runtimeFactory:()=>runtime,tokenProvider:()=> 'control-secret'});
  const response=await handler(new Request('https://control.example/approvals'));
  assert.equal(response.status,401);
});

test('authenticated requests require a canonical operator header and default policy denies',async()=>{
  const runtime=runtimeWithPending();
  const handler=createNeoBotsAdminHttpHandler({runtimeFactory:()=>runtime,tokenProvider:()=> 'control-secret'});
  const noActor=await handler(new Request('https://control.example/approvals',{headers:{authorization:'Bearer control-secret'}}));
  assert.equal(noActor.status,403);
  const denied=await handler(new Request('https://control.example/approvals',{headers:{authorization:'Bearer control-secret','x-neo-actor':'operator-1'}}));
  assert.equal(denied.status,403);
});

test('announcement evidence endpoint is operator-only and read-only',async()=>{
  const runtime=runtimeWithPending();
  let executions=0;
  runtime.attach('neo-bank-bot',async()=>{executions+=1;return {ok:true};});
  const handler=createNeoBotsAdminHttpHandler({runtimeFactory:()=>runtime,tokenProvider:()=> 'control-secret',operatorPolicy:(actor)=>actor.id==='operator-1'});
  const denied=await handler(new Request('https://control.example/announcement-evidence',{method:'POST',headers:{authorization:'Bearer control-secret','content-type':'application/json','x-neo-actor':'other'},body:JSON.stringify({text:'Book Entry: Credit Voucher: CV-1 CES Transaction ID: TX-1'})}));
  assert.equal(denied.status,403);
  const accepted=await handler(new Request('https://control.example/announcement-evidence',{method:'POST',headers:{authorization:'Bearer control-secret','content-type':'application/json','x-neo-actor':'operator-1'},body:JSON.stringify({text:'Book Entry: Credit Voucher: CV-1 CES Transaction ID: TX-1 SELLER: WORLD CREDIT UNION – NMNI0260'})}));
  assert.equal(accepted.status,200);
  const body=await accepted.json();
  assert.equal(body.evidence.state,'TV-1');
  assert.equal(body.evidence.cesTransactionId,'TX-1');
  assert.equal(body.cesWriteExecuted,false);
  assert.equal(executions,0);
});

test('approval HTTP surface ignores spoofed body actor and uses authenticated header actor',async()=>{
  const runtime=runtimeWithPending();
  const pending=await runtime.execute('neo-bank-bot',{action:'ces.transactions.approve',risk:'value-movement',payload:{transactionId:'demo'}});
  const handler=createNeoBotsAdminHttpHandler({runtimeFactory:()=>runtime,tokenProvider:()=> 'control-secret',operatorPolicy:(actor)=>actor.id==='operator-1'});
  const response=await handler(new Request(`https://control.example/approvals/${encodeURIComponent(pending.approval.id)}`,{method:'POST',headers:{authorization:'Bearer control-secret','content-type':'application/json','x-neo-actor':'intruder'},body:JSON.stringify({decision:'approved',actor:{surface:'discord',id:'operator-1'}})}));
  assert.equal(response.status,403);
  assert.equal(runtime.approvals.get(pending.approval.id).status,'pending');
});

test('approval HTTP surface lists and resolves without executing target action',async()=>{
  const runtime=runtimeWithPending();
  let executions=0;
  runtime.attach('neo-bank-bot',async()=>{executions+=1;return {ok:true};});
  const pending=await runtime.execute('neo-bank-bot',{action:'ces.transactions.approve',risk:'value-movement',payload:{transactionId:'demo'}});
  const handler=createNeoBotsAdminHttpHandler({runtimeFactory:()=>runtime,tokenProvider:()=> 'control-secret',operatorPolicy:(actor)=>actor.id==='operator-1'});
  const headers={authorization:'Bearer control-secret','x-neo-actor':'operator-1'};
  const list=await handler(new Request('https://control.example/approvals',{headers}));
  assert.equal(list.status,200);
  const body=await list.json();
  assert.equal(body.approvals[0].id,pending.approval.id);
  const resolve=await handler(new Request(`https://control.example/approvals/${encodeURIComponent(pending.approval.id)}`,{method:'POST',headers:{authorization:'Bearer control-secret','content-type':'application/json','x-neo-actor':'operator-1'},body:JSON.stringify({decision:'approved'})}));
  assert.equal(resolve.status,200);
  assert.equal((await resolve.json()).approval.status,'approved');
  assert.equal(executions,0,'approval endpoint must not execute the governed CES action');
});
