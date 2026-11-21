import test from 'node:test';
import assert from 'node:assert/strict';
import {createGate4Staging} from './staging-gate.mjs';
const NOW='2026-11-20T20:00:00-06:00';
const admin={subject:'test.operator'},outsider={subject:'outsider'};
const source={id:'TEST-LICENSED',type:'licensed_feed',commercialUseAuthorized:true,writtenAuthorizationRef:'vault:terms',
  independentlyVerified:true,verifierRef:'vault:provider-verification'};
const listing=()=>({id:'DEMO-L001',address:'Demo Street Houston',market:'Houston',assetType:'single_family',
  jurisdiction:'US-TX',sourceUrl:'https://example.org/deal',listingStatus:'active',daysOnMarket:188,
  listPriceUsd:180000,statusVerifiedAt:NOW,statusEvidenceRef:'vault:status'});
const buyer=()=>({buyerId:'B-DEMO001',identityVerified:true,identityVerificationRef:'vault:identity',
 consent:{optedIn:true,scope:'property_offers',evidenceRef:'vault:optin',confirmedAt:NOW},
 suppressed:false,fundsVerified:true,proofOfFundsRef:'vault:funds',fundsVerifiedAt:NOW,
 maxAllInUsd:250000,markets:['Houston'],assetTypes:['single_family'],channel:'email'});
const subject={address:'Demo Street Houston',assetType:'single_family',livingSqFt:1500};
const sale=(id,price)=>({id,address:id+' Other Street',soldPriceUsd:price,livingSqFt:1500,
 saleStatus:'closed',soldPriceVerified:true,verificationRef:'vault:sold',valuationUseAuthorized:true,
 permissionRef:'vault:rights',soldAt:NOW,distanceMiles:1,assetType:'single_family',
 adjustmentUsd:0,adjustmentEvidenceRef:'vault:adjust'});
const sales=[sale('sale001',240000),sale('sale002',255000),sale('sale003',270000)];
const costs={repairsUsd:30000,buyerClosingCostsUsd:6000,holdingAndSellingUsd:9000,
 contingencyUsd:5000,requiredBuyerProfitUsd:30000,targetAssignmentFeeUsd:10000,
 assignorDirectCostsUsd:1500};
const previewInput=()=>({actor:admin,listingId:'DEMO-L001',subject,sales,costs,
 valuationReviewRef:'vault:valuation',repairEvidenceRef:'vault:repairs',termsPolicyRef:'vault:policy'});
const maker=(overrides={})=>createGate4Staging({
 authorize:async({actor})=>actor?.subject==='test.operator',
 verifyBuyerAttestation:async()=>true,verifySourceGrant:async()=>true,
 verifyListingAttestation:async()=>true,verifySoldSales:async()=>true,
 verifyUnderwriting:async()=>true,
 sourceConnector:{id:'TEST-LICENSED',grant:source,fetchListings:async()=>[listing()]},
 clock:()=>NOW,...overrides
});
test('deny by default when trusted adapters missing',()=>{
 assert.throws(()=>createGate4Staging({}),/trusted_verifiers_required/);
});
test('unauthorized users cannot write buyer or read listings',async()=>{
 const gate=maker();await assert.rejects(gate.upsertBuyer({actor:outsider,buyer:buyer()}),/not_authorized/);
 await assert.rejects(gate.listingSummaries({actor:outsider}),/not_authorized/);
});
test('accept verified opted-in pseudonymous cash buyer',async()=>{
 const gate=maker();const saved=await gate.upsertBuyer({actor:admin,buyer:buyer()});
 assert.equal(saved.stored,true);assert.equal(saved.personalDataStored,false);
 const summaries=await gate.buyerSummaries({actor:admin});
 assert.deepEqual(summaries.map(x=>x.buyerId),['B-DEMO001']);
});
test('reject direct PII and contact tokens before attestation',async()=>{
 const gate=maker();
 await assert.rejects(gate.upsertBuyer({actor:admin,buyer:{...buyer(),email:'someone@example.org'}}),/private_buyer_data_requires_vault/);
 await assert.rejects(gate.upsertBuyer({actor:admin,buyer:{...buyer(),contactToken:'secret'}}),/private_buyer_data_requires_vault/);
});
test('rejected or stale attestations fail closed',async()=>{
 const gate=maker({verifyBuyerAttestation:async()=>false});
 await assert.rejects(gate.upsertBuyer({actor:admin,buyer:buyer()}),/buyer_attestation_not_verified/);
});
test('provider grant is mandatory before fetching listings',async()=>{
 let fetched=0;const gate=maker({verifySourceGrant:async()=>false,
 sourceConnector:{id:'TEST-LICENSED',grant:source,fetchListings:async()=>{fetched++;return [listing()]}}});
 await assert.rejects(gate.refreshListingFeed({actor:admin}),/feed_authorization_not_verified/);
 assert.equal(fetched,0);
});
test('licensed listing is imported only with independent verification',async()=>{
 const gate=maker();
 const result=await gate.refreshListingFeed({actor:admin});
 assert.equal(result.accepted,1);assert.equal(result.readOnly,true);
 assert.equal((await gate.listingSummaries({actor:admin})).length,1);
});
test('reject source URLs with tokens and query strings',async()=>{
 const gate=maker({sourceConnector:{id:'TEST-LICENSED',grant:source,fetchListings:async()=>[
 {...listing(),id:'DEMO-BAD1',sourceUrl:'https://example.org/deal?token=sensitive'}]}});
 const result=await gate.refreshListingFeed({actor:admin});
 assert.equal(result.accepted,0);
 assert.ok(result.rejected[0].blockers.includes('listing_source_url_with_secrets_or_non_https'));
});
test('buyer matching generates only a review preview and no revenue',async()=>{
 const gate=maker();
 await gate.upsertBuyer({actor:admin,buyer:buyer()});
 await gate.refreshListingFeed({actor:admin});
 const result=await gate.previewMatches(previewInput());
 assert.equal(result.status,'research_review_only');
 assert.equal(result.matches.length,1);
 assert.equal(result.matches[0].maximumSellerContractPriceUsd,150000);
 assert.equal(result.matches[0].dealDeskOpportunity.recognizedRevenueUsd,0);
 assert.equal(result.matches[0].dealDeskOpportunity.quote.ask,null);
});
test('buyer opt-out removes matches and summaries immediately',async()=>{
 const gate=maker();
 await gate.upsertBuyer({actor:admin,buyer:buyer()});
 await gate.refreshListingFeed({actor:admin});
 await gate.suppressBuyer({actor:admin,buyerId:'B-DEMO001'});
 assert.equal((await gate.buyerSummaries({actor:admin})).length,0);
 assert.equal((await gate.previewMatches(previewInput())).matches.length,0);
});
test('closed-sale authentication is mandatory for preview',async()=>{
 const gate=maker({verifySoldSales:async()=>false});
 await gate.refreshListingFeed({actor:admin});
 await assert.rejects(gate.previewMatches(previewInput()),/sale_data_attestation_not_verified/);
});
test('source feed payload must obey bounded page limit',async()=>{
 const gate=maker({sourceConnector:{id:'TEST-LICENSED',grant:source,fetchListings:async()=>Array.from({length:2},()=>listing())}});
 await assert.rejects(gate.refreshListingFeed({actor:admin,limit:1}),/feed_response_invalid/);
});
test('audit exports operation and opaque ID only',async()=>{
 const gate=maker();
 await gate.upsertBuyer({actor:admin,buyer:buyer()});
 const audit=await gate.auditSummary({actor:admin});
 assert.equal(audit[0].operation,'buyer_upsert');
 assert.equal(audit[0].id,'B-DEMO001');
 assert.ok(!JSON.stringify(audit).includes('vault:funds'));
});
