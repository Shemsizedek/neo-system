import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductFounderBinding } from './products.mjs';
import { authorizeOrchestrationAction, registerAgentPrincipal } from './orchestration-authority.mjs';

for(const productId of ['neo-router','neo-algo','neosync','neo-agent-runtime']){
  test(`${productId} reserves founder without autonomous bypass`,()=>{
    const b=getProductFounderBinding(productId);
    assert.equal(b.subjectId,'neo:founder:000001');
    assert.equal(b.account_ordinal,1);
    assert.equal(b.authentication_bypass,false);
  });
}

test('founder ownership alone cannot dispatch autonomous work',()=>{
  const denied=authorizeOrchestrationAction('neo-router','router.dispatch',{subjectId:'neo:founder:000001',authenticated:true});
  assert.equal(denied.allowed,false);
  const allowed=authorizeOrchestrationAction('neo-router','router.dispatch',{subjectId:'neo:founder:000001',authenticated:true,delegationAuthorized:true});
  assert.equal(allowed.allowed,true);
});

test('external tools and trades require explicit step-up authorization',()=>{
  assert.equal(authorizeOrchestrationAction('neo-router','router.external_tool',{subjectId:'neo:founder:000001',authenticated:true,delegationAuthorized:true,externalToolAuthorized:true}).allowed,false);
  assert.equal(authorizeOrchestrationAction('neo-algo','algo.trade.execute',{subjectId:'neo:founder:000001',authenticated:true,delegationAuthorized:true,tradeExecutionAuthorized:true,stepUpVerified:true}).allowed,true);
});

test('agent principals are distinct and cannot impersonate founder',()=>{
  assert.throws(()=>registerAgentPrincipal({agentId:'neo:founder:000001',ownerSubject:'neo:founder:000001'}),/distinct/);
  const agent=registerAgentPrincipal({agentId:'neo:agent:router:001',ownerSubject:'neo:founder:000001',scopes:['read','read','dispatch']});
  assert.equal(agent.mayImpersonateFounder,false);
  assert.equal(agent.secretsStored,false);
  assert.deepEqual(agent.scopes,['read','dispatch']);
});
