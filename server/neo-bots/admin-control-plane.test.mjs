import test from 'node:test';
import assert from 'node:assert/strict';
import { BotRegistry, AuditLedger, NeoBotRuntime } from './runtime.mjs';
import { createNeoBotsAdminControlPlane } from './admin-control-plane.mjs';
import { createEnvCesCredentialProvider, cesSecretRequirements } from './deployment-secrets.mjs';

test('deployment credential provider reads only explicitly trusted exchange login metadata', async()=>{
  const env={NEO_CES_NMNI_USERNAME:'NMNI0000',NEO_CES_NMNI_PASSWORD:'vault-only',NEO_CES_NMNI_LOGIN_PATH:'/legacy-login.asp',NEO_CES_NMNI_SUCCESS_LOCATION_PATTERN:'^/win/'};
  const provider=createEnvCesCredentialProvider(env);
  const result=await provider({exchangeId:'NMNI'});
  assert.equal(result.username,'NMNI0000');
  assert.equal(result.password,'vault-only');
  assert.equal(result.loginPath,'/legacy-login.asp');
  assert.equal(result.successLocationPattern,'^/win/');
  assert.deepEqual(cesSecretRequirements('NMNI').required,['NEO_CES_NMNI_USERNAME','NEO_CES_NMNI_PASSWORD','NEO_CES_NMNI_LOGIN_PATH','NEO_CES_NMNI_SUCCESS_LOCATION_PATTERN']);
});

test('deployment credential provider refuses untrusted default login route', async()=>{
  const provider=createEnvCesCredentialProvider({NEO_CES_NMNI_USERNAME:'NMNI0000',NEO_CES_NMNI_PASSWORD:'vault-only'});
  await assert.rejects(()=>provider({exchangeId:'NMNI'}),/trusted legacy login path is not configured/);
});

test('deployment credential provider refuses login without authenticated-session marker', async()=>{
  const provider=createEnvCesCredentialProvider({NEO_CES_NMNI_USERNAME:'NMNI0000',NEO_CES_NMNI_PASSWORD:'vault-only',NEO_CES_NMNI_LOGIN_PATH:'/legacy-login.asp'});
  await assert.rejects(()=>provider({exchangeId:'NMNI'}),/authenticated-session success marker is not configured/);
});

test('approval control plane requires operator and redacts sensitive payload fields', async()=>{
  const registry=new BotRegistry([{id:'neo-bank-bot',name:'NEO Bank Bot',type:'financial',status:'active',scopes:['ces.vdollars.issue'],requiresHumanApproval:true}]);
  const runtime=new NeoBotRuntime({registry,audit:new AuditLedger()});
  runtime.attach('neo-bank-bot',async()=>({ok:true}));
  const request=await runtime.execute('neo-bank-bot',{action:'ces.vdollars.issue',risk:'value-movement',payload:{amount:25,password:'never-show'}});
  const control=createNeoBotsAdminControlPlane({runtime,operatorPolicy:(actor)=>actor?.id==='operator-1'});
  assert.throws(()=>control.listPending({id:'intruder'}),/operator authorization required/);
  const pending=control.listPending({id:'operator-1'});
  assert.equal(pending[0].id,request.approval.id);
  assert.equal(pending[0].payload.password,'[REDACTED]');
  const approved=control.resolve({surface:'discord',id:'operator-1'},{approvalId:request.approval.id,decision:'approved'});
  assert.equal(approved.status,'approved');
  assert.equal(approved.resolvedBy,'discord:operator-1');
});
