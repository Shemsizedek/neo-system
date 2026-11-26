/** NEO-FLIP-001: pure decision engine; no outreach, signature, CRM write, or payment side effects. */
const safe = (value, max=240) => String(value ?? '').trim().slice(0, max);
const finiteNonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const hasEvidence = value => typeof value === 'string' && value.trim().length > 0;
const normalize = value => safe(value, 100).toLowerCase();
export const FLIP_STAGES = Object.freeze(['sourced','screened','interest_verified','buyer_matched','compliance_review','human_approval','signature_pending','closing_pending','closed','rejected']);
export const FLIP_ACTIONS = Object.freeze(['offer_assignment_interest','request_assignment_signatures','record_closing']);

export function validateDeal(deal = {}) {
  const errors = [];
  if (!hasEvidence(deal.id)) errors.push('deal_id_required');
  if (!hasEvidence(deal.property?.address)) errors.push('property_address_required');
  if (!finiteNonnegative(deal.contract?.purchasePriceUsd)) errors.push('purchase_price_invalid');
  if (!finiteNonnegative(deal.economics?.assignmentFeeUsd)) errors.push('assignment_fee_invalid');
  if (deal.jurisdiction !== 'US-TX') errors.push('jurisdiction_not_cleared');
  return { valid: errors.length === 0, errors };
}
function expirationValid(value, asOf) {
  if (!hasEvidence(value)) return false;
  const expiration = new Date(value).getTime();
  const now = new Date(asOf).getTime();
  return Number.isFinite(expiration) && Number.isFinite(now) && expiration > now;
}
function principalEvidence(deal, asOf) {
  const c = deal.contract || {};
  const blockers = [];
  if (deal.jurisdiction !== 'US-TX') blockers.push('jurisdiction_requires_local_legal_review');
  if (c.executed !== true || !hasEvidence(c.executedDocumentRef)) blockers.push('executed_purchase_contract_not_verified');
  if (c.interestHolderVerified !== true || !hasEvidence(c.interestHolderEvidenceRef)) blockers.push('assignor_equitable_interest_not_verified');
  if (c.assignmentAllowed !== true) blockers.push('assignment_right_not_verified');
  if (!expirationValid(c.expiresAt, asOf)) blockers.push('contract_expired_or_expiry_unverified');
  if (!hasEvidence(deal.disclosures?.sellerWrittenRef)) blockers.push('seller_written_equitable_interest_disclosure_missing');
  if (deal.compliance?.legalReviewApproved !== true || !hasEvidence(deal.compliance?.legalReviewRef)) blockers.push('legal_review_required');
  if (deal.compliance?.principalNotBrokerReviewed !== true) blockers.push('brokerage_boundary_review_required');
  return blockers;
}
export function scoreBuyerMatch(deal, buyer = {}) {
  const reasons = [];
  const purchase = Number(deal?.contract?.purchasePriceUsd);
  const fee = Number(deal?.economics?.assignmentFeeUsd);
  const total = purchase + fee;
  if (!finiteNonnegative(purchase) || !finiteNonnegative(fee)) reasons.push('deal_price_invalid');
  if (!hasEvidence(buyer.id)) reasons.push('buyer_identity_missing');
  if (!Array.isArray(buyer.markets) || !buyer.markets.some(m => normalize(m) === normalize(deal?.property?.market))) reasons.push('market_mismatch');
  if (!Array.isArray(buyer.assetTypes) || !buyer.assetTypes.some(t => normalize(t) === normalize(deal?.property?.type))) reasons.push('asset_type_mismatch');
  if (!finiteNonnegative(buyer.maxTotalPriceUsd) || !(buyer.maxTotalPriceUsd >= total)) reasons.push('buyer_budget_insufficient');
  if (buyer.contactAllowed !== true) reasons.push('contact_permission_missing');
  const fit = reasons.length === 0;
  const proof = buyer.fundsVerified === true && hasEvidence(buyer.proofOfFundsRef);
  const closeReady = Number.isFinite(buyer.closeWithinDays) && buyer.closeWithinDays > 0 && buyer.closeWithinDays <= 30;
  const score = fit ? 70 + (proof ? 20 : 0) + (closeReady ? 10 : 0) : 0;
  return {buyerId: safe(buyer.id,120), score, fit, proofOfFundsVerified: proof, closeReady,
    reasons, estimatedTotalBuyerPriceUsd: Number.isFinite(total) ? total : null};
}
export function rankBuyers(deal, buyers = []) {
  return buyers.map(buyer => scoreBuyerMatch(deal,buyer)).filter(result => result.fit)
    .sort((a,b) => b.score - a.score || a.buyerId.localeCompare(b.buyerId));
}
export function evaluateFlipGates(deal = {}, {asOf = new Date().toISOString()} = {}) {
  const validation = validateDeal(deal);
  const offer = [...validation.errors, ...principalEvidence(deal,asOf)];
  if (!hasEvidence(deal.sources?.sellerAuthorityRef)) offer.push('seller_authority_source_missing');
  const signatures = [...offer];
  if (!hasEvidence(deal.disclosures?.buyerWrittenRef)) signatures.push('buyer_written_equitable_interest_disclosure_missing');
  if (!hasEvidence(deal.buyer?.id) || !hasEvidence(deal.buyer?.proofOfFundsRef) || deal.buyer?.fundsVerified !== true) signatures.push('buyer_and_funds_not_verified');
  if (!hasEvidence(deal.documents?.counselApprovedAssignmentRef)) signatures.push('counsel_approved_assignment_agreement_missing');
  if (!hasEvidence(deal.approvals?.humanApprovalRef)) signatures.push('human_approval_missing');
  if (!hasEvidence(deal.closing?.titleCompanyRef)) signatures.push('title_or_escrow_provider_missing');
  if (deal.compliance?.sellerConsentRequired === true && !hasEvidence(deal.documents?.sellerConsentRef)) signatures.push('seller_consent_required');
  const closing = [...signatures];
  if (!hasEvidence(deal.signatures?.assignorSignedRef)) closing.push('assignor_signature_unverified');
  if (!hasEvidence(deal.signatures?.assigneeSignedRef)) closing.push('assignee_signature_unverified');
  if (!hasEvidence(deal.closing?.escrowSettlementStatementRef) || deal.closing?.settlementVerified !== true) closing.push('escrow_settlement_not_verified');
  if (!hasEvidence(deal.closing?.assignmentFeeDisbursementRef) || deal.closing?.assignmentFeeReceivedVerified !== true) closing.push('assignment_fee_receipt_unverified');
  const distinct = arr => [...new Set(arr)];
  return {
    offer_assignment_interest: {allowed: offer.length === 0, blockers: distinct(offer)},
    request_assignment_signatures: {allowed: signatures.length === 0, blockers: distinct(signatures)},
    record_closing: {allowed: closing.length === 0, blockers: distinct(closing)},
  };
}
export function estimateAssignmentEconomics(deal = {}) {
  const fee = deal.economics?.assignmentFeeUsd;
  const costs = deal.economics?.directCostsUsd ?? 0;
  if (!finiteNonnegative(fee) || !finiteNonnegative(costs)) throw new TypeError('economics_require_nonnegative_numeric_values');
  return {
    expectedAssignmentFeeUsd:fee, expectedDirectCostsUsd:costs, projectedNetUsd:fee-costs,
    recognizedRevenueUsd: deal.closing?.assignmentFeeReceivedVerified === true && hasEvidence(deal.closing?.assignmentFeeDisbursementRef) && deal.closing?.settlementVerified === true && hasEvidence(deal.closing?.escrowSettlementStatementRef) ? fee : 0,
    forecastOnly: !(deal.closing?.assignmentFeeReceivedVerified === true && hasEvidence(deal.closing?.assignmentFeeDisbursementRef) && deal.closing?.settlementVerified === true && hasEvidence(deal.closing?.escrowSettlementStatementRef)),
  };
}
export function toDealDeskOpportunity(deal = {}, options = {}) {
  const gates = evaluateFlipGates(deal, options);
  const candidates = rankBuyers(deal, Array.isArray(deal.buyerCandidates) ? deal.buyerCandidates : []);
  const stage = gates.record_closing.allowed ? 'won' : 'approval_required';
  return {
    normalized: {organization: safe(deal.property?.address,140), geography: safe(deal.property?.market,100), prospectType:'real_estate_assignment'},
    opportunity: {
      externalDealId:safe(deal.id,120), ownerAgent:'NEO-FLIP-001', dealClass:'real_estate_contract_assignment',
      stage, qualification:{score:candidates[0]?.score||0,grade:candidates[0]?.score>=90?'A':candidates[0]?.score>=70?'B':'D'},
      quote:{ask:null,nonBinding:true,approvalRequired:!gates.record_closing.allowed,approvalReasons:gates.request_assignment_signatures.blockers},
      nextAction:gates.request_assignment_signatures.allowed?'request_human_controlled_signature_provider_workflow':'resolve_compliance_and_approval_gates',
      auditRef:safe(deal.auditRef,240)||null,
      sourceRefs:Array.isArray(deal.sources?.publicUrls)?deal.sources.publicUrls.filter(x=>/^https?:\/\//.test(x)).slice(0,10):[],
      projectedEconomics:estimateAssignmentEconomics(deal),
    },
  };
}
export function proposeNextAction(deal, options = {}) {
  const gates = evaluateFlipGates(deal,options);
  if (!gates.offer_assignment_interest.allowed) return {action:'collect_evidence',requiresApproval:false,blockers:gates.offer_assignment_interest.blockers};
  if (!gates.request_assignment_signatures.allowed) return {action:'human_review_and_buyer_diligence',requiresApproval:true,blockers:gates.request_assignment_signatures.blockers};
  if (!gates.record_closing.allowed) return {action:'coordinate_signature_and_escrow',requiresApproval:true,blockers:gates.record_closing.blockers};
  return {action:'record_verified_closing_in_deal_desk',requiresApproval:false,blockers:[]};
}
