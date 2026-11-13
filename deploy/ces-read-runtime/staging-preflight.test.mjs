import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectCesReadStaging,CES_STAGING_ORIGIN} from './staging-preflight.mjs';

const token='synthetic-test-token-not-valid-in-any-real-runtime-123';
function mockRequest({db=false, creds=false, allowAnonymous=false, status=200}={}) {
  const calls=[];
  const request=async(url,opts)=>{
    calls.push({url,method:opts.method,redirect:opts.redirect,authorized:Boolean(opts.headers.authorization)});
    if(url===CES_STAGING_ORIGIN+'/health') return {status,json:async()=>({ok:true,service:'neo-ces-read-runtime',database:db})};
    if(url===CES_STAGING_ORIGIN+'/v1/imports') return {status:allowAnonymous?200:401};
    if(url===CES_STAGING_ORIGIN+'/v1/status' && opts.headers.authorization)
      return {status:200,json:async()=>({exchangeId:'NMNI',databaseConfigured:db,credentialsConfigured:creds,financialWritesEnabled:false})};
    return {status:404};
  };
  return {request,calls};
}
test('public preflight checks health and rejects unauthenticated imports with zero writes',async()=>{
 const {request,calls}=mockRequest();
 const result=await inspectCesReadStaging({request});
 assert.equal(result.publicImportsBlocked,true);
 assert.equal(result.databaseHealthReported,false);
 assert.equal(result.readyForImports,false);
 assert.equal(result.cesAdminAuthenticated,false);
 assert.equal(result.state,'SECURE_PROVISIONING_OR_AUTH_PROOF_PENDING');
 assert.deepEqual(calls.map(x=>[x.method,x.url.split('/').slice(-1)[0]]),[['GET','health'],['GET','imports']]);
 assert.equal(calls.every(x=>x.redirect==='manual'&&!x.authorized),true);
});
test('dedicated control token proves configuration only, not actual CES authentication or import',async()=>{
 const {request,calls}=mockRequest({db:true,creds:true});
 const result=await inspectCesReadStaging({request,token});
 assert.equal(result.state,'READY_FOR_SEPARATE_AUTH_PROOF');
 assert.equal(result.readyForImports,false);
 assert.equal(result.cesAdminAuthenticated,false);
 assert.equal(result.sourceImportPerformed,false);
 assert.equal(result.nmniCredentialPresenceConfirmed,true);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET','GET']);
 assert.equal(calls[2].authorized,true);
 assert.doesNotMatch(JSON.stringify(result),/synthetic-test-token/);
});
test('unsafe or unavailable health and authorization fail closed',async()=>{
 await assert.rejects(()=>inspectCesReadStaging({request:mockRequest({allowAnonymous:true}).request}),/CRITICAL/);
 await assert.rejects(()=>inspectCesReadStaging({token:'short',request:mockRequest().request}),/Invalid/);
 const r=await inspectCesReadStaging({request:mockRequest({status:503}).request});
 assert.equal(r.state,'HEALTH_NOT_VERIFIED');
 assert.equal(r.readyForImports,false);
});
