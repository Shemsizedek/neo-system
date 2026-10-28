import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeNomniMarketObservation,projectNomniMarketWithProvenance} from './nomni-market-provenance.mjs';
test('XCPDEX screenshot price remains clearly unverified',()=>{
 const x=normalizeNomniMarketObservation({asset:'NOMNI',pair:'NOMNI/XCP',source_kind:'xcpdex-screen',price_xcp:'9.00000000',source_timestamp:'2026-10-23T17:00:00Z'});
 const p=projectNomniMarketWithProvenance({marketObservation:x});
 assert.equal(p.market.price_xcp,'9.00000000');assert.equal(p.market.status,'exchange_reported_unverified');
 assert.equal(p.market_value_verified,false);assert.equal(p.reserves_verified,false);assert.equal(p.index_level,null);
});
test('rejects invalid pair and fabricated numeric input',()=>{
 const base={asset:'NOMNI',pair:'NOMNI/XCP',source_kind:'counterparty-v2',price_xcp:'9',source_timestamp:'2026-10-23T17:00:00Z'};
 assert.throws(()=>normalizeNomniMarketObservation({...base,pair:'NOMNI/USD'}));
 assert.throws(()=>normalizeNomniMarketObservation({...base,price_xcp:'NaN'}));
});
