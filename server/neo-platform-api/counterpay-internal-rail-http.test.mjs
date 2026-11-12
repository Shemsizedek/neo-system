import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {createCounterpayInternalRailHandler} from './counterpay-internal-rail-http.mjs';
const ROOT='f'.repeat(64);
const PAYLOAD={entries:[{recordRef:'11111111-1111-4111-8111-111111111111',recordClass:'COURT_FILING',privacy:'RESTRICTED',commitment:'a'.repeat(64)}]};
function anchor({commitments}) {return {state:'prepared_offchain',anchored:false,broadcastEnabled:false,crownAuthorized:false,transactionId:null,
 root:ROOT,counterpartyBroadcastText:`NEO:eGAAS:1:${ROOT}`,proofs:commitments.map(commitment=>({commitment,proof:[]}))};}
async function serverRun(options, fn){
  const handler=createCounterpayInternalRailHandler({prepareAnchor:anchor,...options});
  const server=http.createServer(async(req,res)=>{const url=new URL(req.url, 'http://local.test');if(await handler(req,res,url))return;res.writeHead(404);res.end();});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try {return await fn(`http://127.0.0.1:${server.address().port}/api/v1/egaas/internal-rail/prepare`)}
  finally {await new Promise(resolve=>server.close(resolve));}
}
const post=(url, body, headers={'content-type':'application/json'})=>fetch(url,{method:'POST',headers,body});
test('endpoint stays disabled by default',async()=>{
  await serverRun({subjectResolver:()=> 'member'},async url=>{
    const r=await post(url,JSON.stringify(PAYLOAD));assert.equal(r.status,503);assert.equal((await r.json()).error,'internal_rail_preparation_disabled');
  });
});
test('NEOpass authorization and explicit opt-in guard endpoint',async()=>{
  await serverRun({subjectResolver:()=>null,enabled:true},async url=>{
    assert.equal((await post(url,JSON.stringify(PAYLOAD))).status,401);
  });
});
test('prepares a private, no-broadcast receipt only for authenticated callers',async()=>{
  await serverRun({subjectResolver:()=> 'member',enabled:true},async url=>{
    const r=await post(url,JSON.stringify(PAYLOAD));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
    const body=await r.json();assert.equal(body.receipts.length,1);assert.equal(body.anchoring.verified,false);assert.equal(body.operations.broadcast,false);
    assert.equal(body.anchoring.transactionId,null);
  });
});
test('rejects invalid media, method, body, personal data and overlarge payloads without reflecting inputs',async()=>{
  await serverRun({subjectResolver:()=> 'member',enabled:true},async url=>{
    assert.equal((await fetch(url)).status,405);
    assert.equal((await post(url,'{}',{'content-type':'text/plain'})).status,415);
    assert.equal((await post(url,'{')).status,400);
    const privateData=JSON.stringify({...PAYLOAD, privateRecord:'PERSONAL FIXTURE TEXT'});
    const bad=await post(url,privateData);assert.equal(bad.status,400);assert.doesNotMatch(await bad.text(),/PERSONAL FIXTURE TEXT/);
    assert.equal((await post(url,'x'.repeat(65537))).status,413);
  });
});
