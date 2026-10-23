import test from 'node:test';
import assert from 'node:assert/strict';
import {createCounterpartyEvidenceService} from './counterparty-order-evidence.mjs';
const NOW=new Date('2026-10-23T05:00:00.000Z');
const HASH='a'.repeat(64),BLOCK='b'.repeat(64);
const order={tx_hash:HASH,block_index:972716,status:'open',give_asset:'NOMNI',get_asset:'XCP'};
const reply=data=>new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
const sample=(fetchImpl)=>createCounterpartyEvidenceService({fetchImpl,now:()=>NOW});
test('genuine empty order-book response never fabricates price or liquidity',async()=>{
  const calls=[];
  const service=sample(async url=>{calls.push(url);return reply({result:[],result_count:0,next_cursor:null})});
  const result=await service.observe();
  assert.equal(result.market_quote_verified,false);
  assert.equal(result.price,null);
  assert.equal(result.source_status,'observed');
  assert.deepEqual(result.pairs.map(x=>x.status),['no_open_orders','no_open_orders']);
  assert.deepEqual(result.pairs.map(x=>x.open_order_count),[0,0]);
  assert.equal(calls.length,2);
  assert.ok(calls[0].includes('/orders/NOMNI/XCP?status=open&limit=20'));
});
test('open listing linked to a matching block time is not called a trade',async()=>{
  const service=sample(async url=>url.includes('/blocks/972716')
    ?reply({result:{block_index:972716,block_hash:BLOCK,block_time:1792733053}})
    :url.includes('/NOMNI/XCP')?reply({result:[order],result_count:1}):reply({result:[],result_count:0}));
  const result=await service.observe();
  const p=result.pairs[0];
  assert.equal(p.status,'open_listings_present');
  assert.equal(p.open_order_count,1);
  assert.equal(p.orders[0].executed_trade,false);
  assert.equal(p.orders[0].order_creation_block_time,new Date(1792733053*1000).toISOString());
  assert.equal(p.price,null);
  assert.equal(result.market_quote_verified,false);
});
test('missing or mismatched block metadata never supplies observation time',async()=>{
  const service=sample(async url=>url.includes('/blocks/')?
      reply({result:{block_index:972716,block_hash:BLOCK,block_time:0}}):
      url.includes('/NOMNI/XCP')?reply({result:[order],result_count:1}):reply({result:[],result_count:0}));
  const p=(await service.observe()).pairs[0];
  assert.equal(p.orders[0].order_creation_block_time,null);
});
test('mismatched and fabricated orders fail closed',async()=>{
  const service=sample(async url=>url.includes('/NOMNI/XCP')?
    reply({result:[{...order,get_asset:'BTC'}],result_count:1}):reply({result:[],result_count:0}));
  const result=await service.observe();
  assert.equal(result.pairs[0].status,'unavailable');
  assert.equal(result.pairs[0].open_order_count,null);
  assert.equal(result.pairs[0].price,null);
});
test('upstream HTTP error returns explicit unavailable rather than zero orders',async()=>{
  const service=sample(async()=>new Response('upstream error',{status:503}));
  const result=await service.observe();
  assert.equal(result.source_status,'unavailable');
  assert.equal(result.pairs[0].status,'unavailable');
  assert.equal(result.pairs[0].open_order_count,null);
});
test('oversized JSON fails closed with no fabricated availability',async()=>{
  const service=sample(async()=>reply({result:[],result_count:0,padding:'x'.repeat(66000)}));
  assert.equal((await service.observe()).source_status,'unavailable');
});
test('provider queries are cached for repeated requests',async()=>{
  let count=0;const service=sample(async()=>{count++;return reply({result:[],result_count:0});});
  await Promise.all([service.observe(),service.observe()]);
  await service.observe();
  assert.equal(count,2);
});
