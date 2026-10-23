import test from 'node:test';import assert from 'node:assert/strict';
import {projectNomniMarketStatus} from './nomni-market-status.mjs';
test('retail projection separates reported token facts from financial verification',()=>{
 const p=projectNomniMarketStatus({counterpartyObservation:{asset:'NOMNI',verification_status:'provider_observed_unconfirmed',source_claims:{issuer_address:'fixture-address',supply_normalized:'123'}}});
 assert.equal(p.reported_supply,'123');assert.equal(p.market_price,null);assert.equal(p.reserve_value,null);assert.equal(p.trading_enabled,false);
 assert.match(p.labels.blockchain,/not independently confirmed/);
});
test('Crown blockchain receipt is not reserve proof',()=>{
 const p=projectNomniMarketStatus({crownSummary:{asset:'NOMNI',status:'blockchain-evidence-available'}});
 assert.match(p.labels.crown_chain,/review/);assert.match(p.labels.reserves,/not independently verified/);
});
