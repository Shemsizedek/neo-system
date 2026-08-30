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
