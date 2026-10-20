// CASHFLOW-019: End-to-end synthetic identity to lead-read certification.
// Uses fake Firestore and in-memory lead store. No production data or secrets.
import test from 'node:test';
import assert from 'node:assert/strict';
import {issueNeopassToken} from '../../server/neo-platform-api/neopass-google-auth.mjs';
import {createNeopassStagingIdentity} from './neopass-session-adapter.mjs';
import {makeOperatorAcl,attachOperatorAcl} from './operator-acl.mjs';
import {createStagingOperatorHandler} from './operator-handler.mjs';
const now=()=>Date.parse('2026-10-19T20:00:00Z');
const secret='synthetic-test-secret-not-for-deployment-2026-10';
const identity='google:synthetic-operator';
function fixture(grants){
 const db={collection:()=>({where:()=>({limit:()=>({get:async()=>({empty:grants.length===0,docs:grants.map(g=>({data:()=>g}))})})})})};
 const credentialRegistry={getNEOpassCredential:async()=>({subject:identity,status:'active',role:'member'})};
 const registry=attachOperatorAcl({credentials:credentialRegistry,isOperator:makeOperatorAcl({db,now})});
 const verifyIdentity=createNeopassStagingIdentity({secret,registry,now});
 const store={listMetadata:async()=>[{id:'00000000-0000-4000-8000-000000000010',status:'received_unqualified',source:'synthetic_certification'}]};
 const handler=createStagingOperatorHandler({verifyIdentity,store,enabled:true});
 return async token=>{
  let status=0,body;
  await handler({method:'GET',url:'/internal/leads',headers:{cookie:token?'neo_pass_session='+token:''}},
   {writeHead:s=>status=s,end:s=>body=JSON.parse(s)});
  return {status,body};
 };
}
const token=(claims={})=>issueNeopassToken({subject:identity,secret,now,ttlSeconds:600,claims});
const valid={subject:identity,status:'active',permission:'neo_sales_operator',approvedBy:'synthetic-admin',expiresAt:'2026-11-01T00:00:00Z'};
test('signed session + explicit operator grant reads only synthetic lead metadata',async()=>{
 const r=await fixture([valid])(token());assert.equal(r.status,200);assert.equal(r.body.leads.length,1);
});
test('signed session without grant fails',async()=>assert.equal((await fixture([])(token())).status,403));
test('expired grant fails',async()=>assert.equal((await fixture([{...valid,expiresAt:'2026-01-01T00:00:00Z'}])(token())).status,403));
test('unsigned request fails',async()=>assert.equal((await fixture([valid])(null)).status,403));
test('duplicate grant fails',async()=>assert.equal((await fixture([valid,valid])(token())).status,403));
test('elevated JWT claim cannot bypass registry',async()=>assert.equal((await fixture([])(token({role:'executive-admin'}))).status,403));
