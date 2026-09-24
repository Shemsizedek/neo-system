import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createGeneratorServer } from './server.mjs';

async function withServer(fn){
  const server=createGeneratorServer().listen(0,'127.0.0.1');
  await once(server,'listening');
  const {port}=server.address();
  try{return await fn(`http://127.0.0.1:${port}`)}finally{server.close()}
}

test('generator exposes read-only no-fabrication runtime',()=>withServer(async base=>{
  const ready=await (await fetch(base+'/ready')).json();
  assert.equal(ready.ok,true);
  assert.equal(ready.mode,'PUBLIC_READ_ONLY');
  assert.equal(ready.purchasesEnabled,false);
  assert.equal(ready.settlementEnabled,false);

  const products=await (await fetch(base+'/products')).json();
  assert.equal(products.count,0);
  assert.equal(products.status,'NO_PUBLIC_PRODUCTS_PUBLISHED');

  const capacity=await (await fetch(base+'/capacity')).json();
  assert.equal(capacity.available,false);
  assert.equal(capacity.totalHashrateTh,null);

  const quotes=await (await fetch(base+'/hashpower-quotes')).json();
  assert.equal(quotes.available,false);
  assert.deepEqual(quotes.quotes,[]);
}));

test('generator source registry is public metadata without credential material',()=>withServer(async base=>{
  const payload=await (await fetch(base+'/sources')).json();
  assert.ok(payload.sourceTypes.includes('NATIVE_BTC_HASHING'));
  const cryptotab=payload.sources.find(x=>x.id==='cryptotab');
  assert.equal(cryptotab.directBitcoinHashing,false);
  assert.equal(cryptotab.underlyingAsset,'XMR');
  assert.equal('adapter' in cryptotab,false);
  assert.equal(cryptotab.adapterConfigured,true);
}));

test('generator rejects public mutation methods',()=>withServer(async base=>{
  const response=await fetch(base+'/contracts',{method:'POST'});
  assert.equal(response.status,405);
}));
