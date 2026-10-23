import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardmasterHandler} from './cardmaster.mjs';
const NOW = new Date('2026-10-23T05:00:00.000Z');
function mockRes() {
  return {
    headers:{}, statusCode:0, body:null,
    setHeader(k,v){this.headers[k]=v;},
    status(n){this.statusCode=n;return this;},
    json(payload){this.body=payload;return this;},
    send(payload){this.body=payload;return this;},
    end(){return this;}
  };
}
const mockTicker = {async fx(){return {generatedAt:NOW.toISOString(),quotes:[{pair:'NOMNI/USD',mid:1.12,source:'Counterparty DEX',confidence:'derived-from-dex',status:'live',source_observed_at:'2026-10-23T04:59:40.000Z',source_observation_verified:true}]};}};
test('GET collection provides three cards and read-only notice',async()=>{
  const handler=createCardmasterHandler({tickerService:mockTicker,now:()=>NOW});
  const res=mockRes();
  await handler({method:'GET',query:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.cards.length,3);
  assert.equal(res.body.cards[0].market_data.state,'indicative');
  assert.equal(res.headers['Access-Control-Allow-Origin'],undefined);
});
test('POST is denied and never invokes market feed',async()=>{
  const handler=createCardmasterHandler({tickerService:{fx(){throw new Error('must not call');}},now:()=>NOW});
  const res=mockRes();
  await handler({method:'POST',query:{}},res);
  assert.equal(res.statusCode,405);
});
test('SVG needs valid allowlisted card and face',async()=>{
  const handler=createCardmasterHandler({tickerService:{fx(){throw new Error('svg must be offline');}},now:()=>NOW});
  let res=mockRes();
  await handler({method:'GET',query:{format:'svg',card_id:'NEO-CARD-000002',face:'back'}},res);
  assert.equal(res.statusCode,200);
  assert.match(res.body,/image|<svg/);
  assert.match(res.headers['Content-Type'],/svg/);
  res=mockRes();
  await handler({method:'GET',query:{format:'svg',card_id:'BAD'}},res);
  assert.equal(res.statusCode,404);
  res=mockRes();
  await handler({method:'GET',query:{format:'svg',card_id:'NEO-CARD-000002',face:'evil'}},res);
  assert.equal(res.statusCode,400);
});
test('upstream failure is an unavailable quote, not a sample price',async()=>{
  const handler=createCardmasterHandler({tickerService:{async fx(){throw new Error('upstream');}},now:()=>NOW});
  const res=mockRes();
  await handler({method:'GET',query:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.cards[0].market_data.state,'unavailable');
});

test('CORS is restricted to known staging origins',async()=>{
 const handler=createCardmasterHandler({tickerService:mockTicker,now:()=>NOW});
 const evil=mockRes();await handler({method:'GET',query:{},headers:{origin:'https://evil.example'}},evil);
 assert.equal(evil.headers['Access-Control-Allow-Origin'],undefined);
 const trusted=mockRes();await handler({method:'GET',query:{},headers:{origin:'https://neo-crown-cardmaster-runtime.onrender.com'}},trusted);
 assert.equal(trusted.headers['Access-Control-Allow-Origin'],'https://neo-crown-cardmaster-runtime.onrender.com');
});
test('concurrent market refresh requests share a single upstream fetch',async()=>{
 let calls=0;const handler=createCardmasterHandler({tickerService:{async fx(){calls++;return mockTicker.fx();}},now:()=>NOW});
 const left=mockRes(),right=mockRes();
 await Promise.all([handler({method:'GET',query:{}},left),handler({method:'GET',query:{}},right)]);
 assert.equal(calls,1);
 assert.equal(left.statusCode,200);assert.equal(right.statusCode,200);
});
test('ticker snapshot lacking source observation returns no price',async()=>{
 const handler=createCardmasterHandler({tickerService:{async fx(){return {generatedAt:NOW.toISOString(),quotes:[{pair:'NOMNI/USD',mid:9,source:'Counterparty DEX',confidence:'derived-from-dex',status:'live'}]};}},now:()=>NOW});
 const res=mockRes();await handler({method:'GET',query:{}},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.cards[0].market_data.state,'unavailable');
});
