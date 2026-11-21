/** NEO-FLIP-002. Pure functions; no contact, signature, escrow, or bank side effects. */
const str=(v,max=240)=>String(v??'').trim().slice(0,max);
const has=v=>typeof v==='string'&&v.trim().length>0;
const money=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const url=v=>typeof v==='string'&&/^https:\/\/[^/\s]+\/\S*/i.test(v);
const ms=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:NaN;};
export const SCOUT_RULES=Object.freeze({minimumDaysOnMarket:120,maximumSourceAgeHours:72,minimumProjectedNetUsd:7500,comparableCount:2,pilot:'US-TX'});
export function screenStaleListing(l={},options={}) {
 const {now=new Date().toISOString(),minimumDaysOnMarket=SCOUT_RULES.minimumDaysOnMarket,maximumSourceAgeHours=SCOUT_RULES.maximumSourceAgeHours}=options;
 const blockers=[];
 if(!has(l.address)||!has(l.market))blockers.push('address_or_market_missing');
 if(!url(l.sourceUrl))blockers.push('listing_source_missing');
 if(l.jurisdiction!=='US-TX')blockers.push('unsupported_jurisdiction');
 if(!money(l.listPriceUsd)||l.listPriceUsd===0)blockers.push('listing_price_invalid');
 if(!money(l.daysOnMarket)||l.daysOnMarket<minimumDaysOnMarket)blockers.push('listing_not_stale_enough');
 const status=str(l.listingStatus).toLowerCase();
 if(!['active','for_sale'].includes(status))blockers.push('listing_not_active');
 const at=ms(l.statusVerifiedAt),current=ms(now);
 const fresh=Number.isFinite(at)&&Number.isFinite(current)&&at<=current&&(current-at)<=maximumSourceAgeHours*3600000;
 if(!fresh)blockers.push('current_status_not_independently_verified');
 if(l.sourceAccessRightsConfirmed!==true)blockers.push('source_automation_rights_missing');
 const reduction=money(l.originalListPriceUsd)&&money(l.listPriceUsd)&&l.originalListPriceUsd>l.listPriceUsd?l.originalListPriceUsd-l.listPriceUsd:0;
 const reductionPct=reduction>0?Math.round(10000*reduction/l.originalListPriceUsd)/100:0;
 const researchCandidate=money(l.daysOnMarket)&&l.daysOnMarket>=minimumDaysOnMarket&&['active','for_sale'].includes(status)&&url(l.sourceUrl);
 return {
  listingId:str(l.id,120),address:str(l.address,160),daysOnMarket:money(l.daysOnMarket)?l.daysOnMarket:null,
  researchCandidate,automationReady:blockers.length===0,blockers,
  reductionUsd:reduction,reductionPct,
  signalScore:(researchCandidate?50:0)+(reduction?25:0)+(reductionPct>=5?15:0)+(fresh?10:0),
  note:'Listing-age and price-cut signals do not establish seller motivation or wholesale profit.'
 };
}
export function underwriteWholesaleRoom(i={},options={}) {
 const required=['arvUsd','sellerContractPriceUsd','rehabUsd','buyerClosingCostsUsd','holdingSellingCostsUsd','contingencyUsd','targetBuyerProfitUsd','requestedAssignmentFeeUsd','assignorDirectCostsUsd'];
 const invalid=required.filter(k=>!money(i[k]));
 if(invalid.length)return {status:'insufficient_inputs',blockers:invalid.map(k=>'invalid_'+k),hypothetical:true};
 const buyerCeiling=i.arvUsd-i.rehabUsd-i.buyerClosingCostsUsd-i.holdingSellingCostsUsd-i.contingencyUsd-i.targetBuyerProfitUsd;
 const ceiling=money(i.verifiedBuyerMaxAllInUsd)?Math.min(buyerCeiling,i.verifiedBuyerMaxAllInUsd):buyerCeiling;
 const available=Number((ceiling-i.sellerContractPriceUsd).toFixed(2));
 const net=Number((i.requestedAssignmentFeeUsd-i.assignorDirectCostsUsd).toFixed(2));
 const blockers=[];
 if(available<i.requestedAssignmentFeeUsd)blockers.push('buyer_ceiling_below_contract_plus_fee');
 if(net<(options.minimumProjectedNetUsd??SCOUT_RULES.minimumProjectedNetUsd))blockers.push('projected_net_fee_too_small');
 if(!Array.isArray(i.verifiedComparableSalesRefs)||i.verifiedComparableSalesRefs.filter(has).length<SCOUT_RULES.comparableCount)blockers.push('two_sold_comparables_missing');
 if(!has(i.rehabEstimateEvidenceRef))blockers.push('rehab_estimate_unverified');
 if(!money(i.verifiedBuyerMaxAllInUsd)||i.buyerFundsVerified!==true||!has(i.buyerDemandEvidenceRef))blockers.push('buyer_capacity_unverified');
 if(!has(i.sellerNegotiationEvidenceRef))blockers.push('seller_price_not_confirmed');
 if(i.proposedTermsAreBinding===true&&i.humanApprovalVerified!==true)blockers.push('binding_offer_not_approved');
 return {
  status:blockers.length?'research_only':'economically_screened',hypothetical:blockers.length>0,
  buyerUnderwritingCeilingUsd:Number(buyerCeiling.toFixed(2)),effectiveBuyerMaximumUsd:Number(ceiling.toFixed(2)),
  availableSpreadUsd:available,maximumAssignableFeeUsd:Math.max(0,available),
  requestedAssignmentFeeUsd:i.requestedAssignmentFeeUsd,projectedNetUsd:net,
  estimatedCashExposureUsd:money(i.earnestMoneyExposureUsd)?i.earnestMoneyExposureUsd:null,blockers,
  note:'Economic screening only; not a contract, confirmed assignment interest, or realized revenue.'
 };
}
export function buildResearchQueue(listings=[],options={}) {
 const seen=new Set();
 return listings.map(l=>({l,s:screenStaleListing(l,options)}))
  .filter(x=>x.s.researchCandidate)
  .filter(x=>{const key=str(x.l.address).toLowerCase();if(seen.has(key))return false;seen.add(key);return true;})
  .sort((a,b)=>b.s.signalScore-a.s.signalScore)
  .map(x=>({
   id:str(x.l.id,120),address:x.s.address,market:str(x.l.market,120),listPriceUsd:x.l.listPriceUsd,
   sourceUrl:x.l.sourceUrl,signal:x.s,stage:'sourced_research_only',owner:'Shelton Estate & Co.',
   nextAction:'verify_listing_source_rights_status_sold_comps_and_end_buyer'
  }));
}
export function makeDealDeskScoutRecord(l={},options={}) {
 const s=screenStaleListing(l,options);
 if(!s.researchCandidate)throw new Error('not_a_qualified_stale_listing_research_signal');
 return {
  normalized:{organization:s.address,geography:str(l.market,120),prospectType:'wholesale_listing_scout'},
  opportunity:{externalDealId:str(l.id,120),ownerAgent:'NEO-FLIP-001',
   dealClass:'wholesale_listing_research',stage:'discovered',
   qualification:{score:s.signalScore,grade:s.signalScore>=80?'A':'B'},
   quote:{ask:null,nonBinding:true,approvalRequired:true,approvalReasons:['contract_interest_not_yet_acquired']},
   nextAction:s.automationReady?'underwrite_and_verify_buyer_demand':'verify_listing_status_and_permission',
   sourceRefs:[l.sourceUrl],note:'Research prospect only; no assignment rights, signed agreement, verified margin, or seller commitment.'
  }
 };
}
export function evaluateInboundReceivable(p={}) {
 const blockers=[];
 if(p.payeeLegalName!=='Shelton Estate & Co.'||!has(p.verifiedPayeeEntityRef))blockers.push('legal_beneficiary_unverified');
 if(!has(p.payeeInstructionsVerifiedRef))blockers.push('verified_receiving_instructions_missing');
 if(!has(p.independentTitleEscrowProviderRef))blockers.push('title_escrow_provider_missing');
 if(!has(p.executedAssignmentRef)||!has(p.counselApprovedFeeTermsRef))blockers.push('executed_approved_fee_terms_missing');
 if(!money(p.expectedFeeUsd)||p.expectedFeeUsd===0)blockers.push('positive_receivable_amount_required');
 const ready=blockers.length===0;
 const received=ready&&p.escrowSettlementVerified===true&&has(p.escrowSettlementStatementRef)
  &&p.independentReceiptVerified===true&&has(p.independentReceiptRef)&&money(p.receivedFeeUsd)&&p.receivedFeeUsd===p.expectedFeeUsd;
 return {
  payee:'Shelton Estate & Co.',outboundPaymentRequested:false,moneyMovementApprovalRequired:false,
  status:!ready?'setup_blocked':received?'receipt_verified':'awaiting_settlement_or_receipt',
  expectedFeeUsd:money(p.expectedFeeUsd)?p.expectedFeeUsd:null,
  recognizedFeeUsd:received?p.receivedFeeUsd:0,
  blockers,receiptVerificationPending:ready&&!received,
  nextAction:!ready?'verify_payee_contract_and_escrow':'await_independent_settlement_and_bank_confirmation'
 };
}
