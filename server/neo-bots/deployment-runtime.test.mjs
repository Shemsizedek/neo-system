import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoBotsDeploymentControlHandler, createNeoBotsDeploymentRuntime, neoBotsDeploymentHealth, resetNeoBotsDeploymentRuntimeForTests } from './deployment-runtime.mjs';

test('deployment runtime starts with live CES execution disabled',()=>{
  const runtime=createNeoBotsDeploymentRuntime();
  assert.equal(runtime.registry.get('neo-bank-bot').status,'active');
  const health=neoBotsDeploymentHealth({NEO_BOTS_CONTROL_TOKEN:'secret',NEO_BOTS_OPERATOR_IDS:'operator-1'});
  assert.equal(health.controlTokenConfigured,true);
  assert.equal(health.operatorAllowlistConfigured,true);
  assert.equal(health.liveCesExecutionEnabled,false);
});

test('deployment control handler fails closed without operator allowlist',async()=>{
  resetNeoBotsDeploymentRuntimeForTests();
  const handler=createNeoBotsDeploymentControlHandler({NEO_BOTS_CONTROL_TOKEN:'secret'});
  const response=await handler(new Request('https://control.example/approvals',{headers:{authorization:'Bearer secret','x-neo-actor':'operator-1'}}));
  assert.equal(response.status,403);
  const body=await response.json();
  assert.match(body.error,/operator authorization required/);
});

test('deployment control handler accepts allowlisted operator with bearer token',async()=>{
  resetNeoBotsDeploymentRuntimeForTests();
  const handler=createNeoBotsDeploymentControlHandler({NEO_BOTS_CONTROL_TOKEN:'secret',NEO_BOTS_OPERATOR_IDS:'operator-1'});
  const response=await handler(new Request('https://control.example/approvals',{headers:{authorization:'Bearer secret','x-neo-actor':'operator-1'}}));
  assert.equal(response.status,200);
  assert.deepEqual((await response.json()).approvals,[]);
});
