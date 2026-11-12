import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createChordsOrderHttpHandler } from './http-handler.mjs';
import { createChordsGateHandoff } from './handoff.mjs';

async function withApi(fn, scopes=['chords.gate.propose']) {
  let count=0,ctx=null;
  const store={
    async readGate(){return {id:'g2',revision:3,next:{id:'g3',approvalClass:'A'}}},
    async submit(p){count++;return {status:'QUEUED_FOR_AUTHORIZED_RUN',receipt:{orderId:p.orderId},newlyQueued:true}}
  };
  const handoff=createChordsGateHandoff({store,resolvePrincipal:async c=>c});
  const handler=createChordsOrderHttpHandler({handoff,subjectResolver:req=>{
    if(req.headers.authorization==='Bearer good'){req.neopassClaims={sub:'operator-a'};return 'operator-a';}
    return null;
  },authorizeScopes:async(subject,claims)=>{ctx={subject,claims};return scopes;}});
  const server=http.createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
  try {await fn('http://127.0.0.1:'+server.address().port,()=>count,()=>ctx);}
  finally {server.close();await once(server,'close');}
}
const post=(url,body={},headers={})=>fetch(url,{method:'POST',headers:{authorization:'Bearer good','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('trusted resolver and scoped operator accept a bounded order',async()=>{
  await withApi(async(url,count,ctx)=>{
    const response=await post(url,{utterance:'Next gate',expectedRevision:3});
    assert.equal(response.status,202);
    assert.equal((await response.json()).executes,false);
    assert.deepEqual(ctx(),{subject:'operator-a',claims:{sub:'operator-a'}});
    assert.equal(count(),1);
  });
});
test('unsigned, forged and cross-site requests never reach handoff',async()=>{
  await withApi(async(url,count)=>{
    assert.equal((await post(url,{utterance:'Next gate',expectedRevision:3},{authorization:'Bearer forged'})).status,401);
    assert.equal((await post(url,{utterance:'Next gate',expectedRevision:3},{'sec-fetch-site':'cross-site'})).status,403);
    assert.equal((await post(url,{utterance:'Next gate',expectedRevision:3},{authorization:''})).status,401);
    assert.equal(count(),0);
  });
});
test('scope denial and invalid input fail closed',async()=>{
  await withApi(async(url,count)=>{
    assert.equal((await post(url,{utterance:'Next gate',expectedRevision:3})).status,403);
    assert.equal(count(),0);
  },[]);
  await withApi(async(url,count)=>{
    assert.equal((await post(url,{utterance:'Next gate',expectedRevision:'3'})).status,400);
    assert.equal(count(),0);
  });
});
