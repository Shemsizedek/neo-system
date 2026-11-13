import test from 'node:test';
import assert from 'node:assert/strict';
import {runCesStagingAcceptance} from './staging-acceptance.mjs';
import {CES_STAGING_ORIGIN} from './staging-preflight.mjs';

const privateToken='synthetic-test-token-never-operational-ABCDEF0123456789';
const hash='a'.repeat(64);
const adminProof={exchangeId:'NMNI',memberAuthenticated:true,adminAuthenticated:true,
  verifiedAt:'2026-10-30T18:25:00.000Z'};
const entry={id:hash,exchange_id:'NMNI',observed_at:'2026-10-30T18:20:00.000Z',
  imported_at:'2026-10-30T18:25:01.000Z',row_count:2};
function fixture({db=true,cred=true,admin=true,indexMatch=true,anonymousAllowed=false,
  healthCode=200,importResult=null}={}){
 const calls=[];
 const request=async (url,opts)=>{
  const path=url.substring(CES_STAGING_ORIGIN.length);
  const auth=Boolean(opts.headers?.authorization);
  calls.push({path,method:opts.method,auth,redirect:opts.redirect,hasBody:opts.body!==undefined});
  assert.ok(url.startsWith(CES_STAGING_ORIGIN+'/'));
  assert.equal(opts.redirect,'manual');
  if(path==='/health')return {status:healthCode,json:async()=>({
    ok:true,service:'neo-ces-read-runtime',database:db,
  })};
  if(path==='/v1/imports')return auth ?
    {status:200,json:async()=>({imports:indexMatch?[entry]:[]})} :
    {status:anonymousAllowed?200:401};
  if(!auth)throw new Error('Protected route called without token');
  if(path==='/v1/status')return {status:200,json:async()=>({
    exchangeId:'NMNI',databaseConfigured:db,credentialsConfigured:cred,
    financialWritesEnabled:false,
  })};
  if(path==='/v1/auth/check')return {status:200,json:async()=>({
    proof:admin?adminProof:{...adminProof,adminAuthenticated:false},
  })};
  if(path==='/v1/collect-import')return {status:200,json:async()=>({
    proof:adminProof,import:importResult||{
      id:hash,rowCount:2,recordType:'historical-trading-summary',unit:'NEO',imported:true,
    },
  })};
  throw new Error('Unexpected path '+path);
 };
 return {request,calls};
}
test('default mode proves admin session but never imports or returns sensitive data',async()=>{
 const {request,calls}=fixture();
 const r=await runCesStagingAcceptance({request,token:privateToken});
 assert.equal(r.phase,'STAGING_NMNI_ADMIN_PROOF_ACCEPTED');
 assert.equal(r.verifiedNMNIAdmin,true);
 assert.equal(r.sourceImportAttempted,false);
 assert.equal(r.bankLedgerEntriesCreated,0);
 assert.equal(r.financialTransfersAuthorized,false);
 assert.deepEqual(calls.map(x=>x.path),['/health','/v1/imports','/v1/status','/v1/auth/check']);
 assert.deepEqual(calls.map(x=>x.method),['GET','GET','GET','POST']);
 assert.equal(calls.every(x=>!x.hasBody),true);
 assert.doesNotMatch(JSON.stringify(r),new RegExp(privateToken));
});
test('incomplete database, missing credentials, unavailable health or exposed imports blocks authentication',async()=>{
 for(const config of [{db:false},{cred:false},{healthCode:503}]){
   const {request,calls}=fixture(config);
   const r=await runCesStagingAcceptance({request,token:privateToken});
   assert.equal(r.phase,'BLOCKED_BY_STAGING_PREFLIGHT');
   assert.equal(r.verifiedNMNIAdmin,false);
   assert.equal(calls.some(x=>x.path==='/v1/auth/check'),false);
 }
 const f=fixture({anonymousAllowed:true});
 await assert.rejects(()=>runCesStagingAcceptance({request:f.request,token:privateToken}),/CRITICAL/);
});
test('admin proof failures block any import',async()=>{
 const {request,calls}=fixture({admin:false});
 await assert.rejects(()=>runCesStagingAcceptance({request,token:privateToken}),/administrator proof required/);
 assert.equal(calls.some(x=>x.path==='/v1/collect-import'),false);
});
test('collection requires two explicit gates; verifies source hash in protected index',async()=>{
 for(const o of [
  {explicitImportAuthorization:false,serverImportEnabled:true},
  {explicitImportAuthorization:true,serverImportEnabled:false},
  {explicitImportAuthorization:false,serverImportEnabled:false},
 ]) {
  const {request,calls}=fixture();
  await assert.rejects(()=>runCesStagingAcceptance({
    request,token:privateToken,mode:'collect-once',...o
  }),/explicit authorization/);
  assert.equal(calls.length,0);
 }
 const {request,calls}=fixture();
 const r=await runCesStagingAcceptance({request,token:privateToken,mode:'collect-once',
  explicitImportAuthorization:true,serverImportEnabled:true});
 assert.equal(r.phase,'SOURCE_IMPORT_REFERENCE_RECONCILED');
 assert.equal(r.sourceImportVerified,true);
 assert.equal(r.sourceImportId,hash);
 assert.equal(r.rowCount,2);
 assert.equal(r.bankLedgerEntriesCreated,0);
 assert.equal(r.usdReserveVerified,false);
 assert.deepEqual(calls.map(x=>x.path),[
  '/health','/v1/imports','/v1/status','/v1/auth/check','/v1/collect-import','/v1/imports',
 ]);
 assert.equal(calls.filter(x=>x.method==='POST').length,2);
 assert.equal(calls.every(x=>x.hasBody===false),true);
 assert.doesNotMatch(JSON.stringify({r,calls}),/synthetic-test-token/);
});
test('unmatched import, wrong unit or oversized rows never verify as reconciled',async()=>{
 const miss=fixture({indexMatch:false});
 await assert.rejects(()=>runCesStagingAcceptance({
  request:miss.request,token:privateToken,mode:'collect-once',
  explicitImportAuthorization:true,serverImportEnabled:true,
 }),/not reconciled/);
 for(const item of [
  {id:hash,rowCount:251,recordType:'historical-trading-summary',unit:'NEO',imported:true},
  {id:hash,rowCount:2,recordType:'historical-trading-summary',unit:'USD',imported:true},
  {id:'x',rowCount:2,recordType:'historical-trading-summary',unit:'NEO',imported:true},
 ]) {
  const f=fixture({importResult:item});
  await assert.rejects(()=>runCesStagingAcceptance({
    request:f.request,token:privateToken,mode:'collect-once',
    explicitImportAuthorization:true,serverImportEnabled:true,
  }),/Unexpected CES source import proof/);
 }
});
