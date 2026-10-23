import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createGeneratorServer} from './server.mjs';
const token='d'.repeat(64);
async function withServer(options,fn){
  const server=createGeneratorServer(options).listen(0,'127.0.0.1');
  await once(server,'listening');
  try{await fn(`http://127.0.0.1:${server.address().port}`)}finally{
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
}
test('private status denies anonymous, wrong token, browser origin and query-string secrets',()=>withServer({
  env:{NEO_CLOUD_SANDBOX_READ_TOKEN:token},fetchImpl:()=>{throw Error('MUST_NOT_FETCH')}
},async base=>{
  for (const headers of [{},{authorization:'Bearer wrong'}]) assert.equal((await fetch(base+'/sandbox/status',{headers})).status,401);
  assert.equal((await fetch(base+'/sandbox/status?token=secret',{headers:{authorization:'Bearer '+token}})).status,403);
  assert.equal((await fetch(base+'/sandbox/status',{headers:{authorization:'Bearer '+token,origin:'https://example.com'}})).status,403);
  assert.equal((await fetch(base+'/sandbox/status',{method:'POST',headers:{authorization:'Bearer '+token}})).status,405);
}));
test('proper token cannot enable an unconfigured sandbox or public contracts',()=>withServer({
  env:{NEO_CLOUD_SANDBOX_READ_TOKEN:token},fetchImpl:()=>{throw Error('MUST_NOT_FETCH')}
},async base=>{
  const response=await fetch(base+'/sandbox/status',{headers:{authorization:'Bearer '+token}});
  assert.equal(response.status,503);assert.equal((await response.json()).status,'SANDBOX_DISABLED');
  assert.equal((await fetch(base+'/contracts',{method:'POST'})).status,405);
  assert.equal((await(await fetch(base+'/capacity')).json()).available,false);
}));
test('authenticated provider diagnostic never forwards account records or financial authority',()=>withServer({
  env:{NEO_CLOUD_SANDBOX_READ_TOKEN:token,NEO_CLOUD_SANDBOX_ENABLED:'true',NICEHASH_TEST_API_KEY:'fixture',NICEHASH_TEST_API_SECRET:'fixture',NICEHASH_TEST_ORGANIZATION_ID:'fixture',NICEHASH_TEST_ORDER_ID:'00000000-0000-4000-8000-000000000001'},
  fetchImpl:async url=>new Response(JSON.stringify(url.endsWith('/myOrders')?{list:[{id:'00000000-0000-4000-8000-000000000001',algorithm:'SHA256',customer:'never-display'}]}:{stats:[]}))
},async base=>{
  const response=await fetch(base+'/sandbox/status',{headers:{authorization:'Bearer '+token}});
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const data=await response.json();assert.equal(data.authenticated,true);assert.equal(data.contractActivationEnabled,false);
  assert.equal(JSON.stringify(data).includes('never-display'),false);
}));
