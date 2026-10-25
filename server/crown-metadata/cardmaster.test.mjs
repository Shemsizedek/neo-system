import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMarketPanel,buildCardmasterRecord} from './cardmaster.mjs';
test('unknown market data never fabricates a quote',()=>assert.equal(buildMarketPanel().quote,null));
test('targets cannot masquerade as market quotes',()=>assert.equal(buildMarketPanel({kind:'target',target:'$144M'}).state,'target'));
test('observed quotes require sources',()=>assert.throws(()=>buildMarketPanel({kind:'observed',asset:'NOMNI',venue:'X',pair:'NOMNI/USD',currency:'USD',price:'1',observed_at:'2026-10-23T00:00:00.000Z',now:'2026-10-23T01:00:00.000Z',source_url:'http://example.com'})));
test('stale prices rejected',()=>assert.throws(()=>buildMarketPanel({kind:'observed',asset:'NOMNI',venue:'X',pair:'NOMNI/USD',currency:'USD',price:'1',observed_at:'2026-10-20T00:00:00.000Z',now:'2026-10-23T01:00:00.000Z',source_url:'https://example.com'})));
test('record preserves provenance warnings',()=>{const c=buildCardmasterRecord({card_id:'NEO-CARD-000001',title:'NOMNI',visual_concept:'Gold octahedron',financial_claims:{projected_roi:'14.4%'}});assert.equal(c.provenance.artwork_generated,false);assert.equal(c.financial_claims.projected_roi.classification,'unverified_operator_claim');assert.equal(c.market_data.quote,null);});
