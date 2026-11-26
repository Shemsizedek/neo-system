import test from 'node:test';
import assert from 'node:assert/strict';
import {screenMultifamilyProperty,screenOrangeChipIssuer,screenGovernmentDemo} from './pilot-qualification.mjs';

test('Houston listing matching 20+ units and 4% cap remains unqualified without title and financing',()=>{
 const a=screenMultifamilyProperty({id:'DIXIE-7115',units:20,statedCapRatePct:7,askingPriceUsd:1750000,listingUrl:'https://www.crexi.com/properties/1985353/texas-8-cap-rate-multi-family-property'});
 assert.equal(a.preliminaryBuyBoxMatch,true);assert.equal(a.status,'evidence-incomplete');assert.equal(a.publicAssistanceEligible,false);assert.equal(a.approved,false);
 assert.ok(a.gaps.some(x=>x.includes('siteControl')));
});
test('unit count and cap rate guard against mistaken funding screens',()=>{
 assert.equal(screenMultifamilyProperty({id:'KENNON',units:18,statedCapRatePct:5}).preliminaryBuyBoxMatch,false);
 assert.equal(screenMultifamilyProperty({id:'LOWCAP',units:24,statedCapRatePct:3.9}).preliminaryBuyBoxMatch,false);
});
test('listing price and source must exist, but neither creates site control',()=>{
 const p=screenMultifamilyProperty({id:'NO-URL',units:25,statedCapRatePct:8.65,askingPriceUsd:1849922});
 assert.ok(p.gaps.includes('Working source URL'));assert.equal(p.governmentGrantApplicationReady,false);
});
test('claiming complete document references never automatically certifies government eligibility',()=>{
 const names=['ownerAuthority','siteControl','titleCommitment','survey','rentRoll','trailing12','taxHistory','insuranceQuote','floodReview','developerCapacity','financingCommitments'];
 const verifiedDocuments=Object.fromEntries(names.map(name=>[name,'VERIFIED:example-review-id']));
 const p=screenMultifamilyProperty({id:'SAMPLE',units:25,statedCapRatePct:6,askingPriceUsd:2000000,listingUrl:'https://example.com',verifiedDocuments});
 assert.equal(p.status,'document-pack-review-required');assert.equal(p.approved,false);assert.equal(p.publicAssistanceEligible,false);
});
test('STANSHARES cannot be declared legal equity from name or on-chain supply alone',()=>{
 const p=screenOrangeChipIssuer({id:'STANSHARES',assetName:'STANSHARES'});
 assert.equal(p.legalEquityEstablished,false);assert.equal(p.offeringAuthorized,false);assert.equal(p.secondaryTradingAuthorized,false);
 assert.ok(p.gaps.some(x=>x.includes('signedResolution')));
});
test('unverified issuer materials do not satisfy cryptographic/legal documentation',()=>{
 const p=screenOrangeChipIssuer({id:'KNOWINDEX',assetName:'KNOWINDEX',verifiedDocuments:{capTable:'user-stated'}});
 assert.equal(p.status,'evidence-incomplete');assert.ok(p.gaps.some(x=>x.includes('capTable')));
});
test('government demo is read-only and not a certified Bitcoin reserve',()=>{
 const p=screenGovernmentDemo({id:'TX-BTC-001'});
 assert.equal(p.readOnly,true);assert.equal(p.privateKeyAccess,false);assert.equal(p.publicReserveBalanceCertified,false);
 assert.ok(p.gaps.some(x=>x.includes('externalBitcoinData')));
});
test('even full demo document-pack references require independent approval and never imply TX vendor registration',()=>{
 const docs=['readOnlyCodeReview','unitTests','externalBitcoinData','reconciliationVarianceTest','securityThreatModel','dataClassification','publicClaimsReview','agencyPilotScope'];
 const verifiedDocuments=Object.fromEntries(docs.map(name=>[name,'VERIFIED:review-id']));
 const p=screenGovernmentDemo({verifiedDocuments});
 assert.equal(p.status,'document-pack-review-required');
 assert.equal(p.governmentContractEligible,false);assert.equal(p.texasVendorCredentialVerified,false);assert.equal(p.governmentEndorsement,false);
});
