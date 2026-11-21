import test from 'node:test';
import assert from 'node:assert/strict';
import {
  screenStaleListing,underwriteWholesaleRoom,buildResearchQueue,
  makeDealDeskScoutRecord,evaluateInboundReceivable
} from './stale-listing.mjs';
const NOW='2026-11-20T19:00:00-06:00';
const listing=()=>({
 id:'DEMO-001',address:'Demonstration Ave, Houston, TX',market:'Houston',jurisdiction:'US-TX',
 sourceUrl:'https://example.org/listing',daysOnMarket:200,listingStatus:'active',
 listPriceUsd:355000,originalListPriceUsd:375000,statusVerifiedAt:NOW,sourceAccessRightsConfirmed:true
});
const underwriting=()=>({
 arvUsd:390000,sellerContractPriceUsd:260000,rehabUsd:45000,
 buyerClosingCostsUsd:10000,holdingSellingCostsUsd:12000,contingencyUsd:5000,
 targetBuyerProfitUsd:30000,requestedAssignmentFeeUsd:12000,assignorDirectCostsUsd:1000,
 verifiedBuyerMaxAllInUsd:280000,verifiedComparableSalesRefs:['vault:comp1','vault:comp2'],
 rehabEstimateEvidenceRef:'vault:rehab',buyerDemandEvidenceRef:'vault:buyer',
 buyerFundsVerified:true,sellerNegotiationEvidenceRef:'vault:seller'
});
const receivable=()=>({
 payeeLegalName:'Shelton Estate & Co.',verifiedPayeeEntityRef:'vault:entity',
 payeeInstructionsVerifiedRef:'vault:payee',independentTitleEscrowProviderRef:'vault:title',
 executedAssignmentRef:'vault:executed',counselApprovedFeeTermsRef:'vault:counsel',expectedFeeUsd:12000
});
test('200 DOM active listing qualifies for research',()=>{
 const s=screenStaleListing(listing(),{now:NOW});
 assert.equal(s.researchCandidate,true);
 assert.equal(s.automationReady,true);
});
test('unlicensed listing feed is not automation ready',()=>{
 assert.ok(screenStaleListing({...listing(),sourceAccessRightsConfirmed:false},{now:NOW}).blockers.includes('source_automation_rights_missing'));
});
test('old listing status cannot be used for automated pipeline',()=>{
 assert.ok(screenStaleListing({...listing(),statusVerifiedAt:'2026-11-01'},{now:NOW}).blockers.includes('current_status_not_independently_verified'));
});
test('unlisted or withdrawn property is not stale-listing research candidate',()=>{
 assert.equal(screenStaleListing({...listing(),listingStatus:'withdrawn'},{now:NOW}).researchCandidate,false);
});
test('buyer total ceiling limits assignment fee room',()=>{
 const x=underwriteWholesaleRoom(underwriting());
 assert.equal(x.buyerUnderwritingCeilingUsd,288000);
 assert.equal(x.effectiveBuyerMaximumUsd,280000);
 assert.equal(x.availableSpreadUsd,20000);
 assert.equal(x.projectedNetUsd,11000);
 assert.equal(x.status,'economically_screened');
});
test('seller price exceeding buyer maximum blocks viable assignment',()=>{
 assert.ok(underwriteWholesaleRoom({...underwriting(),sellerContractPriceUsd:300000}).blockers.includes('buyer_ceiling_below_contract_plus_fee'));
});
test('missing sold comps cannot produce screened opportunity',()=>{
 assert.ok(underwriteWholesaleRoom({...underwriting(),verifiedComparableSalesRefs:[]}).blockers.includes('two_sold_comparables_missing'));
});
test('verified buyer funding is mandatory to screen',()=>{
 assert.ok(underwriteWholesaleRoom({...underwriting(),buyerFundsVerified:false}).blockers.includes('buyer_capacity_unverified'));
});
test('de-duplicate listing by address',()=>{
 assert.equal(buildResearchQueue([listing(),listing()],{now:NOW}).length,1);
});
test('Deal Desk scout record does not claim binding terms or income',()=>{
 const x=makeDealDeskScoutRecord(listing(),{now:NOW});
 assert.equal(x.opportunity.stage,'discovered');
 assert.equal(x.opportunity.quote.ask,null);
 assert.equal(x.opportunity.quote.nonBinding,true);
});
test('incoming receivable never generates outgoing money movement',()=>{
 const r=evaluateInboundReceivable(receivable());
 assert.equal(r.moneyMovementApprovalRequired,false);
 assert.equal(r.outboundPaymentRequested,false);
 assert.equal(r.recognizedFeeUsd,0);
});
test('unverified payee instructions block setup',()=>{
 assert.ok(evaluateInboundReceivable({...receivable(),payeeInstructionsVerifiedRef:''}).blockers.includes('verified_receiving_instructions_missing'));
});
test('receipt recognized only with matching fee and independent settlement',()=>{
 const r=evaluateInboundReceivable({...receivable(),escrowSettlementVerified:true,escrowSettlementStatementRef:'vault:statement',independentReceiptVerified:true,independentReceiptRef:'vault:bank-confirmation',receivedFeeUsd:12000});
 assert.equal(r.status,'receipt_verified');
 assert.equal(r.recognizedFeeUsd,12000);
});
test('partial receipt is not marked verified',()=>{
 assert.equal(evaluateInboundReceivable({...receivable(),escrowSettlementVerified:true,escrowSettlementStatementRef:'vault:statement',independentReceiptVerified:true,independentReceiptRef:'vault:bank',receivedFeeUsd:4000}).recognizedFeeUsd,0);
});
