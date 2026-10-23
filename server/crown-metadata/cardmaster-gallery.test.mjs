import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {attributeTickerMarket, createCardmasterCollection, renderCardmasterSvg} from './cardmaster-gallery.mjs';

const NOW = '2026-10-23T05:00:00.000Z';
const packet = (overrides={}) => ({
  generatedAt: NOW, quotes: [{pair:'NOMNI/USD',status:'live',mid:1.17,last:null,
    source:'Counterparty DEX x CoinGecko XCP/USD',confidence:'derived-from-dex',source_observed_at:'2026-10-23T04:59:40.000Z',source_observation_verified:true}],
  ...overrides
});

test('a missing source cannot become a market price', () => {
  assert.equal(attributeTickerMarket(null,'NOMNI/USD',{now:new Date(NOW)}).state,'unavailable');
  assert.equal(attributeTickerMarket(packet({quotes:[]}), 'NOMNI/USD', {now:new Date(NOW)}).quote,null);
});
test('a private asset has no inferred price', () => {
  assert.equal(attributeTickerMarket(packet(),null,{now:new Date(NOW)}).quote,null);
});
test('NOMNI DEX cross rate is indicative, not a last trade', () => {
  const view=attributeTickerMarket(packet(),'NOMNI/USD',{now:new Date(NOW)});
  assert.equal(view.state,'indicative');
  assert.equal(view.quote.price,'1.17');
  assert.equal(view.quote.price_kind,'derived_indicative');
  assert.equal(view.quote.trade_execution_verified,false);
  assert.equal(view.quote.upstream_observation_time_verified,true);
  assert.match(view.label,/NOT A LAST TRADE/);
  assert.equal(view.quote.source_url,'https://api.counterparty.io:4000/v2/orders');
});
test('missing, future, stale and invalid snapshot values fail closed', () => {
  const cases=[
    packet({generatedAt:'unknown'}),
    packet({generatedAt:'2026-10-23T05:01:00.000Z'}),
    packet({generatedAt:'2026-10-23T04:54:00.000Z'}),
    packet({quotes:[{pair:'NOMNI/USD',status:'live',mid:0,source:'Counterparty DEX',confidence:'derived-from-dex'}]}),
    packet({quotes:[{pair:'NOMNI/USD',status:'live',mid:Infinity,source:'Counterparty DEX',confidence:'derived-from-dex'}]}),
    packet({quotes:[{pair:'NOMNI/USD',status:'live',mid:22,source:'Random Blog',confidence:'derived-from-dex'}]}),
    packet({quotes:[{pair:'NOMNI/USD',status:'unavailable',mid:22,source:'Counterparty DEX',confidence:'derived-from-dex'}]})
  ];
  for (const example of cases) assert.equal(attributeTickerMarket(example,'NOMNI/USD',{now:new Date(NOW)}).quote,null);
});
test('reference quotes are not valuations', () => {
  const view=attributeTickerMarket(packet({quotes:[{pair:'BTC/USD',status:'live',last:98123,source:'mempool.space',confidence:'reference',source_observed_at:'2026-10-23T04:59:30.000Z',source_observation_verified:true}]}), 'BTC/USD',{now:new Date(NOW)});
  assert.equal(view.quote.price,'98123');
  assert.match(view.label,/NOT A VALUATION/);
});
test('collection contains three records and no certified financial claims', () => {
  const deck=createCardmasterCollection({tickerPacket:packet(),now:NOW});
  assert.equal(deck.cards.length,3);
  assert.equal(deck.read_only,true);
  assert.equal(deck.cards[0].market_data.state,'indicative');
  assert.equal(deck.cards[1].market_data.quote,null);
  for (const card of deck.cards) {
    assert.equal(card.provenance.financial_claims_verified,false);
    assert.equal(card.provenance.ai_artwork_generated,false);
    assert.equal(card.provenance.artwork_generated,true);
    assert.equal(card.provenance.vector_artwork_generated,true);
    assert.equal(card.issuer_verified,false);
    for (const claim of Object.values(card.financial_claims)) assert.equal(claim.classification,'unverified_operator_claim');
    const {content_hash,hash_algorithm,...body}=card;
    assert.equal(content_hash,createHash('sha256').update(JSON.stringify(body)).digest('hex'));
    assert.equal(hash_algorithm,'sha256-json-utf8');
  }
});
test('SVG renders both faces deterministically with no external content', () => {
  const record=createCardmasterCollection({now:NOW}).cards[0];
  for (const face of ['front','back']) {
    const svg=renderCardmasterSvg(record,{face});
    assert.equal(svg,renderCardmasterSvg(record,{face}));
    assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.doesNotMatch(svg,/<script|<foreignObject|<image |href="https?:/);
    assert.match(svg,/NOT A SECURITIES OFFER/);
  }
});
test('SVG escapes malicious submitted strings', () => {
  const record={...createCardmasterCollection({now:NOW}).cards[1],title:'<script onload="x">&',financial_claims:{current_value:{value:'<img src=x onerror=alert(1)>',classification:'unverified_operator_claim'}}};
  for(const face of ['front','back']) {
    const svg=renderCardmasterSvg(record,{face});
    assert.doesNotMatch(svg,/<script|<img |[[:space:]]onerror=/);
    assert.match(svg,/&lt;/);
  }
});
test('invalid SVG face is rejected',()=>assert.throws(()=>renderCardmasterSvg(createCardmasterCollection({now:NOW}).cards[0],{face:'unknown'})));

test('retrieval time without verified upstream observation is not a quote',()=>{
  const p=packet({quotes:[{pair:'NOMNI/USD',status:'live',mid:16,source:'Counterparty DEX',confidence:'derived-from-dex'}]});
  const market=attributeTickerMarket(p,'NOMNI/USD',{now:new Date(NOW)});
  assert.equal(market.state,'unavailable');
  assert.match(market.reason,/timestamp not independently verified/);
});
test('future or stale source observation fails closed',()=>{
  for(const timestamp of ['2026-10-23T04:48:00.000Z','2026-10-23T05:03:00.000Z','invalid']){
    const p=packet({quotes:[{pair:'NOMNI/USD',status:'live',mid:16,source:'Counterparty DEX',confidence:'derived-from-dex',source_observed_at:timestamp,source_observation_verified:true}]});
    assert.equal(attributeTickerMarket(p,'NOMNI/USD',{now:new Date(NOW)}).quote,null);
  }
});
