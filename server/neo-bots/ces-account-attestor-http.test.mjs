import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createCesReadServer} from './ces-read-server.mjs';

const backendToken='staging-backend-token-fixture-'.repeat(3);
const operatorToken='staging-operator-token-fixture-'.repeat(3);
async function running(options,fn){
  const server=createCesReadServer({
    env:{NEO_CES_RUNTIME_TOKEN:operatorToken,NEO_CES_BACKEND_TOKEN:backendToken},
    ...options
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{return await fn('http://127.0.0.1:'+server.address().port)}
  finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
const request=(base,authorization,body={})=>fetch(base+'/v1/account/attest',{
  method:'POST',
  headers:{authorization,'content-type':'application/json'},
  body:JSON.stringify(body)
});

test('new attestation route is unavailable without approved server verifier',async()=>running({},async base=>{
  assert.equal((await request(base,'Bearer unknown')).status,401);
  assert.equal((await request(base,'Bearer '+operatorToken)).status,403);
  const response=await request(base,'Bearer '+backendToken);
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{error:'account_attestation_unavailable'});
}));

test('approved backend receives only attestation result, no upstream record',async()=>running({
  accountAttestor:{attest:async()=>({attestation:{proofType:'specific-account-control-verified'},signature:'fixture-signature'})}
},async base=>{
  const response=await request(base,'Bearer '+backendToken,{exchangeId:'NMNI'});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{
    attestation:{proofType:'specific-account-control-verified'},signature:'fixture-signature'
  });
  const operatorResponse=await request(base,'Bearer '+operatorToken);
  assert.equal(operatorResponse.status,403);
}));

test('attestation verification errors return a fixed response',async()=>running({
  accountAttestor:{attest:async()=>{throw new Error('untrusted-upstream-error')}}
},async base=>{
  const response=await request(base,'Bearer '+backendToken,{exchangeId:'NMNI'});
  assert.equal(response.status,422);
  assert.deepEqual(await response.json(),{error:'ces_account_control_not_verified'});
}));
