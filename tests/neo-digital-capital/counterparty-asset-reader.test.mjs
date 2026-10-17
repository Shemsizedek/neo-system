import test from 'node:test';
import assert from 'node:assert/strict';
import {createCounterpartyAssetReader} from '../../src/neo-digital-capital/counterparty-asset-reader.mjs';
test('fetches and labels source-checked metadata without implying legal rights',async()=>{
 const reader=createCounterpartyAssetReader({baseUrl:'https://counterparty.example',fetchImpl:async (url,opts)=>{assert.match(url,/\/v2\/assets\/TESTASSET$/);assert.equal(opts.method,'GET');return {ok:true,json:async()=>({result:{asset:'TESTASSET',issuer:'bc1example'}})};}});
 const result=await reader.getAsset('TESTASSET');assert.equal(result.verification_status,'source_checked');assert.equal(result.legal_rights_status,'unknown');assert.equal(result.market_eligible,false);
});
test('rejects invalid names',async()=>{const reader=createCounterpartyAssetReader({baseUrl:'https://counterparty.example',fetchImpl:async()=>{throw Error('should not fetch')}});await assert.rejects(()=>reader.getAsset('../bad'))});
test('requires HTTPS',()=>assert.throws(()=>createCounterpartyAssetReader({baseUrl:'http://example.org'})));
test('rejects malformed responses',async()=>{const reader=createCounterpartyAssetReader({baseUrl:'https://counterparty.example',fetchImpl:async()=>({ok:true,json:async()=>({})})});await assert.rejects(()=>reader.getAsset('TESTASSET'))});
