import test from 'node:test';import assert from 'node:assert/strict';
import {createNomniOrderMarketAdapter} from './nomni-order-market-adapter.mjs';
test('bid and ask are order book quotes, not last-trade or Crown verification',async()=>{
 const a=createNomniOrderMarketAdapter({fetchJson:async()=>({result:[
 {status:'open',give_asset:'NOMNI',get_asset:'XCP',give_remaining_normalized:'2',get_remaining_normalized:'18'},
 {status:'open',give_asset:'XCP',get_asset:'NOMNI',give_remaining_normalized:'8',get_remaining_normalized:'2'}]})});
 const v=await a.snapshot();assert.equal(v.best_ask_xcp,'9');assert.equal(v.best_bid_xcp,'4');
 assert.equal(v.last_trade_xcp,null);assert.equal(v.market_value_verified,false);
});
test('missing/malformed data fails closed',async()=>{
 const a=createNomniOrderMarketAdapter({fetchJson:async()=>({result:null})});
 await assert.rejects(()=>a.snapshot(),/invalid_orders_response/);
});
