import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoFxServer } from './dedicated.mjs';

async function request(path,method='GET'){
 const server=createNeoFxServer({tickers:{tickers:async()=>({status:'REFERENCE',source:'mock',as_of:'2026-11-03T00:00:00Z',markets:[]})}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fetch('http://127.0.0.1:'+server.address().port+path,{method});}
 finally{server.close();}
}
test('health explicitly states trading disabled',async()=>{
 const response=await request('/health');assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.execution,false);assert.equal(body.authorization,'disabled');
});
test('OAuth callback refuses to impersonate live auth',async()=>{
 const response=await request('/api/integrations/alpaca/oauth/callback?code=sample&state=sample');
 assert.equal(response.status,503);assert.equal((await response.json()).code,'PRIVATE_AUTH_NOT_DEPLOYED');
});
test('private portfolio refuses unauthenticated access',async()=>{
 const response=await request('/api/account/portfolio');assert.equal(response.status,503);
});
test('exchange order submission blocked at ingress',async()=>{
 const response=await request('/api/neo-exchange/orders/compose','POST');assert.equal(response.status,405);
});
test('reference tickers served read-only',async()=>{
 const response=await request('/api/markets/tickers?market=fx');
 assert.equal(response.status,200);assert.equal((await response.json()).source,'mock');
});
test('reference tickers reject writes',async()=>{
 const response=await request('/api/markets/tickers','POST');assert.equal(response.status,405);
});
test('reject dot-file requests',async()=>{
 const response=await request('/.env');assert.equal(response.status,400);
});
test('unknown API is not routed to frontend',async()=>{
 const response=await request('/api/unknown');assert.equal(response.status,404);
});
