import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDeal, scoreBuyerMatch, rankBuyers, evaluateFlipGates,
  estimateAssignmentEconomics, toDealDeskOpportunity, proposeNextAction,
} from './core.mjs';
const NOW='2026-11-20T18:00:00.000Z';
function clearedDeal() {
  return {
    id:'FLIP-TX-TEST-001',jurisdiction:'US-TX',
    property:{address:'123 Example Street, Houston, TX',market:'Houston',type:'single_family'},
    contract:{purchasePriceUsd:120000,assignmentAllowed:true,executed:true,executedDocumentRef:'vault:contract-001',interestHolderVerified:true,interestHolderEvidenceRef:'vault:interest-001',expiresAt:'2026-12-31T00:00:00Z'},
    economics:{assignmentFeeUsd:10000,directCostsUsd:1500},
    sources:{sellerAuthorityRef:'vault:seller-001',publicUrls:['https://example.org/record']},
    disclosures:{sellerWrittenRef:'vault:disclose-seller-001',buyerWrittenRef:'vault:disclose-buyer-001'},
    compliance:{legalReviewApproved:true,legalReviewRef:'vault:lawyer-001',principalNotBrokerReviewed:true,sellerConsentRequired:false},
    documents:{counselApprovedAssignmentRef:'vault:assignment-template-001'},
    buyer:{id:'B-101',fundsVerified:true,proofOfFundsRef:'vault:funds-001'},
    approvals:{humanApprovalRef:'vault:approval-001'},
    closing:{titleCompanyRef:'vault:title-001'},
  };
}
const buyer={id:'B-101',markets:['Houston'],assetTypes:['single_family'],maxTotalPriceUsd:140000,contactAllowed:true,fundsVerified:true,proofOfFundsRef:'vault:proof-001',closeWithinDays:15};
test('rejects unsupported jurisdiction and negative assignment fee',()=>{
  const deal=clearedDeal();deal.jurisdiction='US-FL';deal.economics.assignmentFeeUsd=-1;
  assert.deepEqual(validateDeal(deal).errors,['assignment_fee_invalid','jurisdiction_not_cleared']);
  assert.equal(evaluateFlipGates(deal,{asOf:NOW}).offer_assignment_interest.allowed,false);
});
test('blocks missing contractual interest and seller disclosure',()=>{
  const deal=clearedDeal();deal.contract.interestHolderVerified=false;deal.disclosures.sellerWrittenRef='';
  const gate=evaluateFlipGates(deal,{asOf:NOW}).offer_assignment_interest;
  assert.equal(gate.allowed,false);
  assert.ok(gate.blockers.includes('assignor_equitable_interest_not_verified'));
  assert.ok(gate.blockers.includes('seller_written_equitable_interest_disclosure_missing'));
});
test('expired agreement and missing brokerage review fail closed',()=>{
  const deal=clearedDeal();deal.contract.expiresAt='2026-11-01';deal.compliance.principalNotBrokerReviewed=false;
  const gate=evaluateFlipGates(deal,{asOf:NOW}).offer_assignment_interest;
  assert.ok(gate.blockers.includes('contract_expired_or_expiry_unverified'));
  assert.ok(gate.blockers.includes('brokerage_boundary_review_required'));
});
test('buyer matching requires market asset all-in budget and contact consent',()=>{
  const deal=clearedDeal();
  assert.equal(scoreBuyerMatch(deal,buyer).score,100);
  assert.equal(scoreBuyerMatch(deal,buyer).estimatedTotalBuyerPriceUsd,130000);
  assert.equal(scoreBuyerMatch(deal,{...buyer,maxTotalPriceUsd:129999}).fit,false);
  assert.equal(scoreBuyerMatch(deal,{...buyer,contactAllowed:false}).fit,false);
  assert.equal(scoreBuyerMatch(deal,{...buyer,markets:['Dallas']}).fit,false);
});
test('ranks only eligible buyers and distinguishes proof of funds from claims',()=>{
  const deal=clearedDeal();
  const ranked=rankBuyers(deal,[{...buyer,id:'B-2',fundsVerified:false,proofOfFundsRef:''},{...buyer,id:'B-1'},{...buyer,id:'B-3',maxTotalPriceUsd:0}]);
  assert.deepEqual(ranked.map(x=>x.buyerId),['B-1','B-2']);
  assert.equal(ranked[1].proofOfFundsVerified,false);
});
test('requires buyer disclosure, counsel form and human approval before signatures',()=>{
  const deal=clearedDeal();delete deal.approvals.humanApprovalRef;delete deal.documents.counselApprovedAssignmentRef;delete deal.disclosures.buyerWrittenRef;
  const gates=evaluateFlipGates(deal,{asOf:NOW});
  assert.equal(gates.offer_assignment_interest.allowed,true);
  assert.equal(gates.request_assignment_signatures.allowed,false);
  assert.ok(gates.request_assignment_signatures.blockers.includes('human_approval_missing'));
  assert.equal(proposeNextAction(deal,{asOf:NOW}).requiresApproval,true);
});
test('contract-specific seller consent must be evidenced',()=>{
  const deal=clearedDeal();deal.compliance.sellerConsentRequired=true;
  assert.ok(evaluateFlipGates(deal,{asOf:NOW}).request_assignment_signatures.blockers.includes('seller_consent_required'));
});
test('record closing only with both signatures settlement and disbursement',()=>{
  const deal=clearedDeal();
  assert.equal(evaluateFlipGates(deal,{asOf:NOW}).request_assignment_signatures.allowed,true);
  assert.equal(evaluateFlipGates(deal,{asOf:NOW}).record_closing.allowed,false);
  deal.signatures={assignorSignedRef:'vault:sign-A',assigneeSignedRef:'vault:sign-B'};
  Object.assign(deal.closing,{escrowSettlementStatementRef:'vault:closing',settlementVerified:true,assignmentFeeDisbursementRef:'vault:disbursed',assignmentFeeReceivedVerified:true});
  assert.equal(evaluateFlipGates(deal,{asOf:NOW}).record_closing.allowed,true);
  assert.equal(estimateAssignmentEconomics(deal).recognizedRevenueUsd,10000);
});
test('forecasts are not realized revenues until documented settlement',()=>{
  const projection=estimateAssignmentEconomics(clearedDeal());
  assert.equal(projection.projectedNetUsd,8500);
  assert.equal(projection.recognizedRevenueUsd,0);
  assert.equal(projection.forecastOnly,true);
  assert.throws(()=>estimateAssignmentEconomics({economics:{assignmentFeeUsd:100,directCostsUsd:-1}}));
});
test('Deal Desk handoff redacts private emails and avoids binding quotes',()=>{
  const deal=clearedDeal();deal.buyer.email='private@example.com';deal.buyerCandidates=[buyer];
  const handoff=toDealDeskOpportunity(deal,{asOf:NOW});
  assert.equal(handoff.opportunity.ownerAgent,'NEO-FLIP-001');
  assert.equal(handoff.opportunity.stage,'approval_required');
  assert.equal(handoff.opportunity.quote.ask,null);
  assert.equal(handoff.opportunity.qualification.score,100);
  assert.ok(!JSON.stringify(handoff).includes('private@example.com'));
});
