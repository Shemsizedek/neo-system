import test from 'node:test';import assert from 'node:assert/strict';
import {parseCounterpartyAssetObservation,createCounterpartyObservationAdapter} from './nomni-counterparty-observation.mjs';
test('provider observation is never on-chain confirmation or a price',async()=>{
 const adapter=createCounterpartyObservationAdapter({fetchJson:async()=>({result:{asset:'NOMNI',issuer:'example-address',supply_normalized:'500'}})});
 const r=await adapter.observe('NOMNI');
 assert.equal(r.verification_status,'provider_observed_unconfirmed');
 assert.equal(r.bitcoin_confirmation_status,'not_checked');
 assert.equal(r.market_price,null);assert.equal(r.index_value,null);
 assert.equal(r.independently_verified_reserves,false);
});
test('mismatched or absent data fails closed',()=>{
 assert.throws(()=>parseCounterpartyAssetObservation('NOMNI',{result:{asset:'BTC'}}),/asset_mismatch/);
 assert.throws(()=>parseCounterpartyAssetObservation('NOMNI',{result:null}),/invalid_counterparty_response/);
 assert.throws(()=>parseCounterpartyAssetObservation('../secret',{result:{}}),/invalid_asset/);
});
