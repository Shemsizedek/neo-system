import test from 'node:test';import assert from 'node:assert/strict';
import {createNomniScanIntegration} from './nomni-scan-integration.mjs';
test('Counterparty observation goes through restricted injected JSON transport',async()=>{
 const calls=[];
 const app=createNomniScanIntegration({publicSourceFetcher:async()=>{throw Error('not requested')},robotsAllowed:async()=>true,
 counterpartyJsonFetcher:async(url,opts)=>{calls.push({url,opts});return {result:{asset:'NOMNI',issuer:'issuer-fixture'}}}});
 const result=await app.snapshot();
 assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.counterparty.io:4000/v2/assets/NOMNI');
 assert.equal(calls[0].opts.redirect,'error');
 assert.equal(result.counterparty_observation.verification_status,'provider_observed_unconfirmed');
 assert.equal(result.verified_index_level,null);
 assert.equal(result.source_crawl,null);
});
test('fails closed if transport or robots policy missing',()=>assert.throws(()=>createNomniScanIntegration({}),/verified_transport_and_robots_required/));
test('rejects incorrect upstream asset',async()=>{
 const app=createNomniScanIntegration({publicSourceFetcher:async()=>{},robotsAllowed:async()=>true,counterpartyJsonFetcher:async()=>({result:{asset:'OTHER'}})});
 await assert.rejects(()=>app.snapshot(),/asset_mismatch/);
});
