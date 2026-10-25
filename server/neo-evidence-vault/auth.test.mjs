import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createEvidenceVault} from './store.mjs';
import {createHandler,credentialsFromEnv} from './server.mjs';

const credentials=[{token:'synthetic-reader',actor:'demo-reader',roles:['read']},{token:'synthetic-writer',actor:'demo-ingester',roles:['read','ingest']},{token:'synthetic-reviewer',actor:'demo-reviewer',roles:['read','review']}];
async function fixture(t,config=credentials){
 const vault=createEvidenceVault(':memory:');
 const server=http.createServer(createHandler(vault,{credentials:config}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));vault.close();});
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=async(path,{token,body,method='GET',headers={}}={})=>{
  const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json()};
 };
 return {vault,request};
}
test('unconfigured service exposes health only and refuses data',async t=>{
 const {request}=await fixture(t,[]);
 assert.equal((await request('/health')).status,200);
 for(const method of ['GET','POST','PATCH'])assert.equal((await request('/assets/DEMO/evidence',{method})).status,503);
});
test('missing and wrong bearer tokens cannot read or mutate',async t=>{
 const {request,vault}=await fixture(t);
 for(const token of [undefined,'incorrect'])for(const method of ['GET','POST','PATCH'])assert.equal((await request('/assets/DEMO/evidence',{token,method})).status,401);
 assert.equal(vault.listEvidence('DEMO').length,0);
});
test('reader cannot ingest or review; writer cannot review',async t=>{
 const {request,vault}=await fixture(t);
 const entry=vault.createEvidence({asset:'DEMO',title:'Synthetic only',sourceType:'TEST'});
 assert.equal((await request('/assets/DEMO/evidence',{token:'synthetic-reader',method:'POST',body:{title:'x',sourceType:'TEST'}})).status,403);
 for(const token of ['synthetic-reader','synthetic-writer'])assert.equal((await request(`/evidence/${entry.id}/review`,{token,method:'PATCH',body:{status:'ACCEPTED'}})).status,403);
 assert.equal(vault.getEvidence(entry.id).reviewStatus,'UNREVIEWED');
});
test('synthetic ingest → review → export binds actors to credentials',async t=>{
 const {request}=await fixture(t);
 const created=await request('/assets/DEMO/evidence',{token:'synthetic-writer',method:'POST',headers:{'X-Reviewer':'spoofed-admin'},body:{id:'forged-id',title:'Synthetic Bitcoin policy claim',sourceType:'SYNTHETIC',sourceUrl:'https://example.invalid/demo',reviewStatus:'ACCEPTED',reviewer:'spoofed-admin'}});
 assert.equal(created.status,201);assert.notEqual(created.body.id,'forged-id');assert.equal(created.body.reviewStatus,'UNREVIEWED');assert.equal(created.body.reviewer,undefined);
 const id=created.body.id;
 const reviewed=await request(`/evidence/${id}/review`,{token:'synthetic-reviewer',method:'PATCH',headers:{'X-Reviewer':'spoofed-admin'},body:{status:'ACCEPTED',reviewer:'spoofed-admin',note:'Accepted as a synthetic test fixture only'}});
 assert.equal(reviewed.status,200);assert.equal(reviewed.body.reviewer,'demo-reviewer');
 const list=await request('/assets/DEMO/evidence',{token:'synthetic-reader'});
 const audit=await request('/assets/DEMO/audit',{token:'synthetic-reader'});
 assert.equal(list.body.evidence.length,1);assert.equal(audit.body.events.length,2);
 assert.deepEqual(new Set(audit.body.events.map(e=>e.actor)),new Set(['demo-ingester','demo-reviewer']));
 assert.equal((await request(`/evidence/${id}`,{token:'synthetic-reader'})).body.reviewStatus,'ACCEPTED');
});
test('credentials reject invalid roles, duplicates and malformed configuration',()=>{
 assert.throws(()=>credentialsFromEnv({NEO_EVIDENCE_CREDENTIALS:'broken'}));
 assert.throws(()=>credentialsFromEnv({NEO_EVIDENCE_CREDENTIALS:JSON.stringify([{token:'x',actor:'a',roles:['admin']}])}));
 assert.throws(()=>credentialsFromEnv({NEO_EVIDENCE_CREDENTIALS:JSON.stringify([credentials[0],credentials[0]])}));
 assert.equal(credentialsFromEnv({}).length,0);
 assert.equal(credentialsFromEnv({NEO_EVIDENCE_API_TOKEN:'legacy-test'} )[0].actor,'evidence-service');
});
