import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkListingDataRights,evaluateSoldComps,qualifyBuyerForContact,
  calculateBuyerFirstCeiling,prepareSellerInquiry,toBuyerFirstDealDeskRecord
} from './buyer-first.mjs';

const NOW='2026-11-20T20:00:00-06:00';
const listing=()=>({
 id:'DEMO-LISTING-001',address:'Demo Road, Houston, TX',market:'Houston',
 assetType:'single_family',jurisdiction:'US-TX',sourceUrl:'https://example.org/listings/1',
 listingStatus:'active',daysOnMarket:175,listPriceUsd:180000,
 statusVerifiedAt:NOW,statusEvidenceRef:'vault:verified-status'
});
const source=()=>({
 id:'provider-1',type:'licensed_feed',commercialUseAuthorized:true,
 writtenAuthorizationRef:'vault:source-contract',
 independentlyVerified:true,verifierRef:'vault:permission-check'
});
const buyer=()=>({
 buyerId:'buyer-001',identityVerified:true,identityVerificationRef:'vault:identity',
 consent:{optedIn:true,scope:'property_offers',evidenceRef:'vault:opt-in',confirmedAt:NOW},
 suppressed:false, fundsVerified:true,proofOfFundsRef:'vault:funds',
 fundsVerifiedAt:NOW,maxAllInUsd:250000,markets:['Houston'],assetTypes:['single_family'],
 channel:'email',contactToken:'secrets:contact-route-1',email:'private@example.org'
});
const subject=()=>({address:'Demo Road, Houston, TX',assetType:'single_family',livingSqFt:1500});
const comp=(id,price)=>({
 id,address:id+' Other Street, Houston, TX',soldPriceUsd:price,livingSqFt:1500,
 saleStatus:'closed',soldPriceVerified:true,verificationRef:'vault:record-'+id,
 valuationUseAuthorized:true,permissionRef:'vault:license-'+id,
 soldAt:NOW,distanceMiles:0.8,assetType:'single_family',
 adjustmentUsd:0,adjustmentEvidenceRef:'vault:review-'+id
});
const comps=()=>[comp('closed-001',240000),comp('closed-002',255000),comp('closed-003',270000)];
const costs=()=>({
 repairsUsd:30000,buyerClosingCostsUsd:6000,holdingAndSellingUsd:9000,
 contingencyUsd:5000,requiredBuyerProfitUsd:30000,
 targetAssignmentFeeUsd:10000,assignorDirectCostsUsd:1500
});
const opts=()=>({
 now:NOW,source:source(),valuationReviewRef:'vault:valuation-review',
 repairEvidenceRef:'vault:rehab',termsPolicyRef:'vault:policy'
});
const valuation=()=>evaluateSoldComps(subject(),comps(),{now:NOW});
test('source requires independently verified permission and a fresh active listing',()=>{
 assert.equal(checkListingDataRights(listing(),source(),{now:NOW}).allowed,true);
 assert.ok(checkListingDataRights(listing(),{...source(),commercialUseAuthorized:false},{now:NOW}).blockers.includes('commercial_use_authorization_missing'));
});
test('HAR page is not an automated permissioned source without licensed rights',()=>{
 const x=checkListingDataRights({...listing(),sourceUrl:'https://www.har.com/homedetail/1'},{...source(),type:'permitted_public_record'},{now:NOW});
 assert.ok(x.blockers.includes('har_commercial_reuse_not_authorized'));
});
test('stale status, wrong jurisdiction, and too-new listing block import',()=>{
 const v=checkListingDataRights({...listing(),statusVerifiedAt:'2026-01-01',jurisdiction:'US-FL',daysOnMarket:25},source(),{now:NOW});
 assert.equal(v.allowed,false);
 assert.ok(v.blockers.includes('listing_status_unverified_or_stale'));
 assert.ok(v.blockers.includes('listing_not_aged'));
});
test('three verified sold comps return provisional conservative valuation',()=>{
 const v=valuation();
 assert.equal(v.eligibleSaleCount,3);
 assert.equal(v.status,'provisional_not_appraisal');
 assert.equal(v.indicativeArvUsd,255000);
 assert.equal(v.conservativeArvUsd,240000);
});
test('invalid or duplicate comps cannot satisfy the minimum count',()=>{
 const v=evaluateSoldComps(subject(),[comp('a',240000),comp('a',250000),{...comp('b',230000),valuationUseAuthorized:false}],{now:NOW});
 assert.equal(v.status,'insufficient_evidence');
 assert.ok(v.rejected.some(x=>x.blockers.includes('duplicate_or_missing_sale_id')));
 assert.ok(v.rejected.some(x=>x.blockers.includes('sold_data_valuation_rights_missing')));
});
test('unverified funds, absent opt-in, or suppression reject buyer',()=>{
 assert.equal(qualifyBuyerForContact(buyer(),{now:NOW}).qualified,true);
 assert.equal(qualifyBuyerForContact({...buyer(),fundsVerified:false},{now:NOW}).qualified,false);
 assert.equal(qualifyBuyerForContact({...buyer(),suppressed:true},{now:NOW}).qualified,false);
 assert.equal(qualifyBuyerForContact({...buyer(),consent:{...buyer().consent,optedIn:false}},{now:NOW}).qualified,false);
});
test('buyer registry projection never exposes email or contact token',()=>{
 const result=JSON.stringify(qualifyBuyerForContact(buyer(),{now:NOW}));
 assert.ok(!result.includes('private@example.org'));
 assert.ok(!result.includes('secrets:contact-route-1'));
});
test('buyer-first underwriting respects conservative ARV and buyer ceiling',()=>{
 const r=calculateBuyerFirstCeiling({listing:listing(),buyer:buyer(),valuation:valuation(),costs:costs()},opts());
 assert.equal(r.status,'indicative_buyer_first_ceiling');
 assert.equal(r.maximumSellerContractPriceUsd,150000);
 assert.equal(r.estimatedNetAssignmentFeeUsd,8500);
 assert.equal(r.sellerDiscountRequiredFromAskUsd,30000);
 assert.equal(r.requiresSellerAcceptance,true);
});
test('unverified valuation review blocks price recommendation',()=>{
 const o=opts();delete o.valuationReviewRef;
 const r=calculateBuyerFirstCeiling({listing:listing(),buyer:buyer(),valuation:valuation(),costs:costs()},o);
 assert.equal(r.status,'research_only');
 assert.equal(r.maximumSellerContractPriceUsd,null);
});
test('mismatched buyer asset type blocks price recommendation',()=>{
 const r=calculateBuyerFirstCeiling({listing:listing(),buyer:{...buyer(),assetTypes:['condo']},valuation:valuation(),costs:costs()},opts());
 assert.equal(r.status,'research_only');
 assert.ok(r.blockers.includes('buyer_buy_box_mismatch'));
});
test('unprofitable deal is not economically viable',()=>{
 const r=calculateBuyerFirstCeiling({listing:listing(),buyer:buyer(),valuation:valuation(),costs:{...costs(),repairsUsd:190000}},opts());
 assert.equal(r.status,'not_economically_viable');
 assert.equal(r.maximumSellerContractPriceUsd,null);
});
test('seller outreach is never sent and requires lawful route',()=>{
 const request=prepareSellerInquiry({
  listing:listing(),source:source(),
  sender:{entityName:'Shelton Estate & Co.',entityVerified:true,entityEvidenceRef:'vault:legal',representativeAuthorized:true,representativeEvidenceRef:'vault:representative'},
  route:{type:'listing_agent_business',lawfulContactRef:'vault:contact-permission',sourceRef:'vault:address',channel:'email',routeToken:'private:route'}
  ,options:{now:NOW}
 });
 assert.equal(request.status,'draft_ready_for_human_review');
 assert.equal(request.canSend,false);
 assert.ok(request.body.includes('prospective principal purchaser'));
});
test('sender authority and lawful contact route failure blocks seller inquiry',()=>{
 const request=prepareSellerInquiry({listing:listing(),source:source(),sender:{entityName:'Shelton Estate & Co.'},route:{},options:{now:NOW}});
 assert.equal(request.status,'draft_blocked');
 assert.equal(request.canSend,false);
});
test('Deal Desk handoff is advisory-only and privacy-minimized',()=>{
 const record=toBuyerFirstDealDeskRecord({listing:listing(),buyer:buyer(),valuation:valuation(),costs:costs(),source:source()},opts());
 assert.equal(record.opportunity.stage,'approval_required');
 assert.equal(record.opportunity.indicativeMaximumSellerPriceUsd,150000);
 assert.equal(record.opportunity.recognizedRevenueUsd,0);
 assert.equal(record.opportunity.quote.ask,null);
 assert.ok(!JSON.stringify(record).includes('private@example.org'));
 assert.ok(!JSON.stringify(record).includes('secrets:contact-route-1'));
});
