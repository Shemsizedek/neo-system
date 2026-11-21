/** NEO-FLIP-003 — Source rights, buyer-first matching, sold comp screening and unsent outreach drafts.
 * All inputs are untrusted until verified by authenticated provider adapters.
 * Pure functions; never send, sign, persist personal data, or move funds.
 */
const has=v=>typeof v==='string'&&v.trim().length>0;
const clean=(v,n=240)=>String(v??'').trim().slice(0,n);
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const nonnegative=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const timestamp=v=>{const n=new Date(v).getTime();return Number.isFinite(n)?n:NaN;};
const same=(a,b)=>clean(a,120).toLowerCase()===clean(b,120).toLowerCase();
const approvedSourceTypes=Object.freeze(['licensed_feed','owner_submitted','permitted_public_record']);
export const GATE3_POLICY=Object.freeze({
  minimumDaysOnMarket:120,listingFreshHours:72,
  maximumComparableAgeDays:365,maximumComparableDistanceMiles:2,
  minimumComparableCount:3,maximumSqftVarianceRatio:0.35,
  buyerFundsFreshDays:90,pilotJurisdiction:'US-TX'
});
const fresh=(value,now,windowMs)=>{
 const v=timestamp(value),n=timestamp(now);
 return Number.isFinite(v)&&Number.isFinite(n)&&v<=n&&n-v<=windowMs;
};
export function checkListingDataRights(listing={},source={},options={}) {
 const now=options.now??new Date().toISOString(),blockers=[];
 if(!approvedSourceTypes.includes(source.type))blockers.push('unapproved_source_type');
 if(source.commercialUseAuthorized!==true||!has(source.writtenAuthorizationRef))blockers.push('commercial_use_authorization_missing');
 if(source.independentlyVerified!==true||!has(source.verifierRef))blockers.push('source_permission_not_verified');
 if(!has(listing.id)||!has(listing.address)||listing.jurisdiction!=='US-TX')blockers.push('listing_identity_or_texas_jurisdiction_missing');
 if(!has(listing.sourceUrl)||!/^https:\/\//i.test(listing.sourceUrl))blockers.push('source_url_missing_or_insecure');
 if(!['active','for_sale'].includes(clean(listing.listingStatus).toLowerCase()))blockers.push('listing_not_active');
 if(!nonnegative(listing.daysOnMarket)||listing.daysOnMarket<GATE3_POLICY.minimumDaysOnMarket)blockers.push('listing_not_aged');
 if(!positive(listing.listPriceUsd))blockers.push('listing_price_missing');
 if(!fresh(listing.statusVerifiedAt,now,GATE3_POLICY.listingFreshHours*3600000)||!has(listing.statusEvidenceRef))blockers.push('listing_status_unverified_or_stale');
 // An ordinary HAR webpage citation does not grant rights to automate commercial reuse.
 if(/https:\/\/(?:www\.)?har\.com\//i.test(clean(listing.sourceUrl,2000))&&source.type!=='licensed_feed'&&source.type!=='owner_submitted')blockers.push('har_commercial_reuse_not_authorized');
 return {sourceId:clean(source.id,80),listingId:clean(listing.id,100),
   allowed:blockers.length===0,blockers,
   disclaimer:'Source attestation flags must be validated by an independent authenticated provider before import.'};
}
export function evaluateSoldComps(subject={},sales=[],options={}) {
 const now=options.now??new Date().toISOString(),blockers=[],rejected=[];
 if(!positive(subject.livingSqFt)||!has(subject.assetType)||!has(subject.address))blockers.push('subject_identity_or_living_area_missing');
 const considered=[],seen=new Set();
 for(const raw of (Array.isArray(sales)?sales:[])){
  const sale=raw||{},why=[],id=clean(sale.id,120);
  if(!id||seen.has(id))why.push('duplicate_or_missing_sale_id');
  if(id)seen.add(id);
  if(!positive(sale.soldPriceUsd)||!positive(sale.livingSqFt))why.push('sale_price_or_living_area_invalid');
  if(sale.saleStatus!=='closed'||sale.soldPriceVerified!==true||!has(sale.verificationRef))why.push('closed_sale_unverified');
  if(sale.valuationUseAuthorized!==true||!has(sale.permissionRef))why.push('sold_data_valuation_rights_missing');
  if(!fresh(sale.soldAt,now,GATE3_POLICY.maximumComparableAgeDays*86400000))why.push('sale_not_recent');
  if(!nonnegative(sale.distanceMiles)||sale.distanceMiles>GATE3_POLICY.maximumComparableDistanceMiles)why.push('sale_too_far');
  if(!same(sale.assetType,subject.assetType))why.push('asset_type_mismatch');
  if(positive(sale.livingSqFt)&&positive(subject.livingSqFt)&&Math.abs(sale.livingSqFt-subject.livingSqFt)/subject.livingSqFt>GATE3_POLICY.maximumSqftVarianceRatio)why.push('living_area_mismatch');
  if(has(subject.address)&&has(sale.address)&&same(subject.address,sale.address))why.push('subject_not_a_comparable');
  if(!nonnegative(sale.adjustmentUsd)&&!(typeof sale.adjustmentUsd==='number'&&Number.isFinite(sale.adjustmentUsd)&&sale.adjustmentUsd<0))why.push('adjustment_invalid');
  if(!has(sale.adjustmentEvidenceRef))why.push('adjustment_evidence_missing');
  if(why.length){rejected.push({saleId:id,blockers:why});continue;}
  const adjusted=sale.soldPriceUsd+sale.adjustmentUsd;
  if(adjusted<=0){rejected.push({saleId:id,blockers:['adjusted_price_nonpositive']});continue;}
  if(Math.abs(sale.adjustmentUsd)>sale.soldPriceUsd*.15){rejected.push({saleId:id,blockers:['adjustment_over_15_percent_review_required']});continue;}
  considered.push({saleId:id,adjustedPricePerSqFtUsd:adjusted/sale.livingSqFt,verificationRef:clean(sale.verificationRef,240)});
 }
 if(considered.length<GATE3_POLICY.minimumComparableCount)blockers.push('insufficient_eligible_closed_sales');
 const vals=considered.map(x=>x.adjustedPricePerSqFtUsd).sort((a,b)=>a-b);
 const median=vals.length?vals[Math.floor((vals.length-1)/2)]*(vals.length%2===0?1:1):null;
 // For even counts use true midpoint; for odd counts the middle value.
 const mid=vals.length%2===0?(vals[vals.length/2-1]+vals[vals.length/2])/2:vals[Math.floor(vals.length/2)];
 const lower=vals.length?vals[Math.max(0,Math.ceil(vals.length*.25)-1)]:null;
 const pointEstimate=blockers.length===0?Math.round(mid*subject.livingSqFt):null;
 const conservativeArv=blockers.length===0?Math.round(Math.min(mid,lower)*subject.livingSqFt):null;
 return {status:blockers.length?'insufficient_evidence':'provisional_not_appraisal',
   eligibleSaleCount:considered.length,eligibleSaleIds:considered.map(x=>x.saleId),
   rejected,blockers,indicativeArvUsd:pointEstimate,conservativeArvUsd:conservativeArv,
   caution:'These figures are provisional. Source contracts, condition and material adjustments require professional review.'};
}
export function qualifyBuyerForContact(buyer={},options={}) {
 const now=options.now??new Date().toISOString(),blockers=[];
 if(!has(buyer.buyerId)||buyer.identityVerified!==true||!has(buyer.identityVerificationRef))blockers.push('identity_not_verified');
 if(buyer.consent?.optedIn!==true||!has(buyer.consent?.evidenceRef)||buyer.consent?.scope!=='property_offers')blockers.push('explicit_property_opt_in_missing');
 if(!fresh(buyer.consent?.confirmedAt,now,365*86400000))blockers.push('consent_expired_or_unverified');
 if(buyer.suppressed===true||buyer.consent?.withdrawn===true)blockers.push('contact_suppressed');
 if(buyer.fundsVerified!==true||!has(buyer.proofOfFundsRef)||!fresh(buyer.fundsVerifiedAt,now,GATE3_POLICY.buyerFundsFreshDays*86400000))blockers.push('funds_unverified_or_stale');
 if(!positive(buyer.maxAllInUsd))blockers.push('buyer_maximum_missing');
 if(!Array.isArray(buyer.markets)||!buyer.markets.some(has)||!Array.isArray(buyer.assetTypes)||!buyer.assetTypes.some(has))blockers.push('buy_box_incomplete');
 if(buyer.channel!=='email')blockers.push('email_only_pilot');
 return {
   buyerId:clean(buyer.buyerId,120),qualified:blockers.length===0,blockers,
   markets:Array.isArray(buyer.markets)?buyer.markets.map(x=>clean(x,100)).slice(0,12):[],
   assetTypes:Array.isArray(buyer.assetTypes)?buyer.assetTypes.map(x=>clean(x,100)).slice(0,12):[],
   verifiedMaximumUsd:positive(buyer.maxAllInUsd)?buyer.maxAllInUsd:null,
   contactTokenPresent:has(buyer.contactToken),
   // Never serialize contactToken, email, real name, address or raw proof-of-funds from buyer records.
 };
}
export function calculateBuyerFirstCeiling({listing={},buyer={},valuation={},costs={}}={},options={}) {
 const source=checkListingDataRights(listing,options.source||{},options),q=qualifyBuyerForContact(buyer,options);
 const blockers=[...source.blockers,...q.blockers];
 if(!q.markets.some(m=>same(m,listing.market))||!q.assetTypes.some(a=>same(a,listing.assetType)))blockers.push('buyer_buy_box_mismatch');
 if(valuation.status!=='provisional_not_appraisal'||!positive(valuation.conservativeArvUsd)||!has(options?.valuationReviewRef))blockers.push('reviewed_sold_comps_absent');
 const amounts=['repairsUsd','buyerClosingCostsUsd','holdingAndSellingUsd','contingencyUsd','requiredBuyerProfitUsd','targetAssignmentFeeUsd','assignorDirectCostsUsd'];
 for(const key of amounts)if(!nonnegative(costs[key]))blockers.push('invalid_'+key);
 if(!has(options?.repairEvidenceRef))blockers.push('repair_estimate_evidence_missing');
 if(!has(options?.termsPolicyRef))blockers.push('approved_underwriting_policy_missing');
 if(blockers.length)return {status:'research_only',blockers:[...new Set(blockers)],maximumSellerContractPriceUsd:null,estimatedNetAssignmentFeeUsd:null,requiresSellerAcceptance:true};
 const investorCeiling=valuation.conservativeArvUsd-costs.repairsUsd-costs.buyerClosingCostsUsd-costs.holdingAndSellingUsd-costs.contingencyUsd-costs.requiredBuyerProfitUsd;
 const buyerCeiling=Math.min(investorCeiling,q.verifiedMaximumUsd);
 const maxSellerPrice=buyerCeiling-costs.targetAssignmentFeeUsd;
 const netFee=costs.targetAssignmentFeeUsd-costs.assignorDirectCostsUsd;
 if(maxSellerPrice<=0||netFee<0)return {status:'not_economically_viable',blockers:['nonpositive_seller_ceiling_or_negative_net_fee'],maximumSellerContractPriceUsd:null,estimatedNetAssignmentFeeUsd:null,requiresSellerAcceptance:true};
 return {
   status:'indicative_buyer_first_ceiling',maximumSellerContractPriceUsd:Math.floor(maxSellerPrice),
   estimatedNetAssignmentFeeUsd:Math.floor(netFee),
   sellerDiscountRequiredFromAskUsd:Math.max(0,Math.ceil(listing.listPriceUsd-maxSellerPrice)),
   listedPriceFitsModel:listing.listPriceUsd<=maxSellerPrice,
   buyerId:q.buyerId,requiresSellerAcceptance:true,
   note:'This is a maximum modeled seller contract price, not a seller offer, executed agreement, committed buyer, or guaranteed assignment fee.'
 };
}
export function prepareSellerInquiry({listing={},source={},sender={},route={},options={}}={}) {
 const verified=checkListingDataRights(listing,source,options),blockers=[...verified.blockers];
 if(sender.entityName!=='Shelton Estate & Co.'||sender.entityVerified!==true||!has(sender.entityEvidenceRef))blockers.push('shelton_legal_entity_not_verified');
 if(!['listing_agent_business','owner_opt_in'].includes(route.type)||!has(route.lawfulContactRef)||route.suppressed===true)blockers.push('lawful_contact_route_missing');
 if(!has(route.sourceRef)||route.channel!=='email')blockers.push('verified_email_channel_required');
 if(sender.representativeAuthorized!==true||!has(sender.representativeEvidenceRef))blockers.push('sender_authority_missing');
 const address=clean(listing.address,160).replace(/[\r\n]/g,' ');
 return {
  status:blockers.length?'draft_blocked':'draft_ready_for_human_review',
  blockers:[...new Set(blockers)],canSend:false,
  subject:'Property availability inquiry — '+address,
  body:'Hello,\n\nI am reaching out on behalf of Shelton Estate & Co. regarding '+address+'. Could you confirm whether the listing remains available and whether the seller would consider an offer from us as a prospective principal purchaser? Any proposed transaction would be subject to our review, written terms, and applicable disclosures.\n\nThank you,\nShelton Estate & Co.',
  recipientRef:has(route.routeToken)?clean(route.routeToken,120):null,
  disclosure:'Draft only. No automated send, purchase commitment, or assertion of contractual ownership.'
 };
}

/** Privacy-minimized Deal Desk handoff: advisory only, never a quote or an executed contract. */
export function toBuyerFirstDealDeskRecord({listing={},buyer={},valuation={},costs={},source={}}={},options={}) {
 const s=calculateBuyerFirstCeiling({listing,buyer,valuation,costs},{...options,source});
 const screened=s.status==='indicative_buyer_first_ceiling';
 return {
   normalized:{organization:clean(listing.address,160),geography:clean(listing.market,120),prospectType:'wholesale_buyer_first'},
   opportunity:{
     externalDealId:clean(listing.id,120),ownerAgent:'NEO-FLIP-001',
     dealClass:'wholesale_contract_research',stage:screened?'approval_required':'discovered',
     qualification:{score:screened?70:0,grade:screened?'B':'D'},
     quote:{ask:null,nonBinding:true,approvalRequired:true,approvalReasons:screened?['seller_contract_not_executed','interest_rights_not_verified']:s.blockers},
     buyerRef:screened?s.buyerId:null,
     indicativeMaximumSellerPriceUsd:screened?s.maximumSellerContractPriceUsd:null,
     potentialNetAssignmentFeeUsd:screened?s.estimatedNetAssignmentFeeUsd:null,
     recognizedRevenueUsd:0,
     nextAction:screened?'review_indicative_seller_ceiling_and_legal_disclosures':'resolve_source_buyer_and_valuation_gates',
     sourceRefs:typeof listing.sourceUrl==='string'&&listing.sourceUrl.startsWith('https://')?[listing.sourceUrl]:[],
     notes:'Research only. No seller acceptance, contract rights, signature, closing or receipt. No outreach sent.'
   }
 };
}
