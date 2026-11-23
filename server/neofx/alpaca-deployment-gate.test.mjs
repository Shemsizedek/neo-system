import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyAlpacaDeployment,guardedPaperAccount,REQUIRED} from './alpaca-deployment-gate.mjs';
const config=Object.fromEntries(REQUIRED.map(k=>[k,'configured-private-resource']));
config.NEOFX_ALPACA_OAUTH_CALLBACK='https://neofx.holytemples.org/api/integrations/alpaca/oauth/callback';
config.NEO_FX_LIVE_TRADING='false';
const deps={verifySession:async()=>({subject:'trustee',tenantId:'tenant-A',authorized:true}),saveState:async()=>{},takeState:async()=>{},getClientSecret:async()=>'',storeToken:async()=>{},getToken:async()=>({accessToken:'secret'})};
test('fails closed when no configuration',()=>assert.equal(verifyAlpacaDeployment({}).ready,false));
test('prevents live execution flag',()=>assert.equal(verifyAlpacaDeployment({...config,NEO_FX_LIVE_TRADING:'true'},deps).ready,false));
test('requires exact public callback',()=>assert.equal(verifyAlpacaDeployment({...config,NEOFX_ALPACA_OAUTH_CALLBACK:'https://other.example'},deps).ready,false));
test('requires all secure dependencies',()=>assert.equal(verifyAlpacaDeployment(config,{}).ready,false));
test('requires paper environment',()=>assert.equal(verifyAlpacaDeployment({...config,NEO_FX_ALPACA_ENVIRONMENT:'live'},deps).ready,false));
test('does not return secret or account identifiers',async()=>{
 const r=await guardedPaperAccount({config,dependencies:deps,sessionCredential:'opaque',fetchAccount:async()=>({status:'ACTIVE',currency:'USD',trading_blocked:false,account_number:'private'})});
 assert.equal(r.accountStatus,'ACTIVE');assert.equal(r.executionEnabled,false);
 assert.equal(JSON.stringify(r).includes('private'),false);assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('rejects unauthorized session',async()=>{await assert.rejects(guardedPaperAccount({config,dependencies:{...deps,verifySession:async()=>({authorized:false})},fetchAccount:async()=>({})}),/identity_not_authorized/);});
test('rejects unconsented account',async()=>{await assert.rejects(guardedPaperAccount({config,dependencies:{...deps,getToken:async()=>null},fetchAccount:async()=>({})}),/paper_oauth_not_authorized/);});
