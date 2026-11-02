import test from 'node:test';
import assert from 'node:assert/strict';
import {runCesAdminLoginPreflight} from './ces-admin-login-preflight.mjs';
const token='preflight-only-fixture-token-'.repeat(2);
const run=async(fake)=>{const records=[];let calls=0;const result=await runCesAdminLoginPreflight({port:10000,token,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'http://127.0.0.1:10000/v1/auth/check');assert.equal(options.method,'POST');assert.equal(options.headers.authorization,'Bearer '+token);assert.equal(options.body,undefined);return fake()},logger:row=>records.push(row)});return{records,result,calls}};

test('staging login preflight identifies administrator proof without retaining credential',async()=>{
 const v=await run(()=>new Response(JSON.stringify({proof:{exchangeId:'NMNI',memberAuthenticated:true,adminAuthenticated:true,verifiedAt:'2026-11-01T00:00:00Z',sensitive:'do-not-log'}}),{status:200}));
 assert.equal(v.result.result,'verified');
 assert.equal(v.calls,1);
 assert.deepEqual(v.records[0],{event:'ces_nmni_auth_preflight',result:'verified',memberAuthenticated:true,adminAuthenticated:true});
 assert.doesNotMatch(JSON.stringify(v.records),/do-not-log|preflight-only-fixture/);
});

test('missing runtime token makes no login call',async()=>{
 let calls=0;
 const result=await runCesAdminLoginPreflight({port:10000,token:'',fetchImpl:async()=>{calls++;throw Error('should not call')},logger:()=>{}});
 assert.equal(calls,0);assert.equal(result.result,'configuration_missing');
});

test('upstream failure returns only allowlisted diagnostic fields',async()=>{
 const v=await run(()=>new Response(JSON.stringify({error:'ces_read_or_import_failed',diagnostic:{stage:'login_submit',reason:'login_contract_mismatch',secret:'no-log',httpStatus:403}}),{status:502}));
 assert.deepEqual(v.records[0],{event:'ces_nmni_auth_preflight',result:'failed',httpStatus:502,stage:'login_submit',reason:'login_contract_mismatch'});
 assert.doesNotMatch(JSON.stringify(v.records),/no-log/);
});

test('failed proof never records verified status and never persists session',async()=>{
 const v=await run(()=>new Response(JSON.stringify({proof:{exchangeId:'NMNI',memberAuthenticated:true,adminAuthenticated:false,verifiedAt:'2026-11-01T00:00:00Z'}}),{status:200}));
 assert.equal(v.result.result,'unverified');
});
