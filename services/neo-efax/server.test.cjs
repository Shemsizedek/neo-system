'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createServer}=require('./server.cjs');
async function withServer(token,run){
 const server=createServer({token});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await run('http://127.0.0.1:'+server.address().port)}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
test('health reports transmission disabled',async()=>withServer('test-token',async url=>{
 const response=await fetch(url+'/health');assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.liveFaxEnabled,false);
 assert.equal(body.transport,'unconfigured');
}));
test('API requires server-side secret and advertises no approval capability',async()=>withServer('test-token',async url=>{
 const noAuth=await fetch(url+'/v1/capabilities');assert.equal(noAuth.status,401);
 const wrong=await fetch(url+'/v1/capabilities',{headers:{authorization:'Bearer wrong'}});assert.equal(wrong.status,401);
 const permitted=await fetch(url+'/v1/capabilities',{headers:{authorization:'Bearer test-token'}});
 assert.equal(permitted.status,200);const result=await permitted.json();
 assert.equal(result.canSubmitFax,false);assert.equal(result.canApproveRequests,false);
}));
test('live fax and privileged workflow routes fail closed',async()=>withServer('test-token',async url=>{
 for(const endpoint of ['/v1/faxes','/v1/requests','/v1/approvals']){
  const response=await fetch(url+endpoint,{method:'POST',headers:{authorization:'Bearer test-token','content-type':'application/json'},body:'{}'});
  assert.equal(response.status,503,endpoint);
 }
}));
test('without an API token all privileged routes are disabled',async()=>withServer(undefined,async url=>{
 const response=await fetch(url+'/v1/capabilities',{headers:{authorization:'Bearer anything'}});
 assert.equal(response.status,401);
}));
