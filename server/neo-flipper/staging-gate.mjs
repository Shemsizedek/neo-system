/** Gate 4 staging-only, ephemeral and no side effects beyond private in-memory state.
 * AuthZ and verification are server-side injected trusted adapters; no provider is bundled.
 */
import {checkListingDataRights,evaluateSoldComps,qualifyBuyerForContact,calculateBuyerFirstCeiling,toBuyerFirstDealDeskRecord} from './buyer-first.mjs';
const has=v=>typeof v==='string'&&v.trim().length>0;
const str=(v,n=160)=>String(v??'').trim().slice(0,n);
const clone=x=>JSON.parse(JSON.stringify(x));
const fail=code=>{const e=new Error(code);e.code=code;throw e};
const sensitive=['name','legalName','email','phone','address','contactToken','ssn','identityDocument','proofOfFundsRaw','bankAccount'];
const bId=/^B-[A-Za-z0-9_-]{3,64}$/;
const lId=/^[A-Za-z0-9_-]{3,100}$/;
function buyerRecord(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('buyer_invalid');
 if(sensitive.some(k=>Object.hasOwn(input,k)))fail('private_buyer_data_requires_vault');
 if(!bId.test(input.buyerId||''))fail('opaque_buyer_id_required');
 return {buyerId:input.buyerId,identityVerified:input.identityVerified===true,
  identityVerificationRef:str(input.identityVerificationRef),
  consent:{optedIn:input.consent?.optedIn===true,scope:str(input.consent?.scope,60),
   evidenceRef:str(input.consent?.evidenceRef),confirmedAt:str(input.consent?.confirmedAt,60),
   withdrawn:input.consent?.withdrawn===true},
  suppressed:input.suppressed===true,fundsVerified:input.fundsVerified===true,
  proofOfFundsRef:str(input.proofOfFundsRef),fundsVerifiedAt:str(input.fundsVerifiedAt,60),
  maxAllInUsd:input.maxAllInUsd,
  markets:Array.isArray(input.markets)?input.markets.slice(0,12).map(v=>str(v,100)):[],
  assetTypes:Array.isArray(input.assetTypes)?input.assetTypes.slice(0,12).map(v=>str(v,100)):[],
  channel:str(input.channel,30)};
}
function listingRecord(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!lId.test(input.id||''))fail('listing_invalid');
 if(typeof input.sourceUrl!=='string'||!/^https:\/\/[^\s/@?#]+(?::[0-9]{1,5})?\/[^\s?#]*$/i.test(input.sourceUrl))fail('listing_source_url_with_secrets_or_non_https');
 const cleanUrl=input.sourceUrl;
 return {id:input.id,address:str(input.address,180),market:str(input.market,100),
  assetType:str(input.assetType,100),jurisdiction:str(input.jurisdiction,20),sourceUrl:cleanUrl,
  listingStatus:str(input.listingStatus,40),daysOnMarket:input.daysOnMarket,listPriceUsd:input.listPriceUsd,
  statusVerifiedAt:str(input.statusVerifiedAt,60),statusEvidenceRef:str(input.statusEvidenceRef)};
}
export function createGate4Staging({authorize,verifyBuyerAttestation,verifySourceGrant,verifyListingAttestation,verifySoldSales,verifyUnderwriting,sourceConnector,clock=()=>new Date().toISOString()}={}){
 if([authorize,verifyBuyerAttestation,verifySourceGrant,verifyListingAttestation,verifySoldSales,verifyUnderwriting].some(fn=>typeof fn!=='function'))fail('trusted_verifiers_required');
 if(!sourceConnector||!has(sourceConnector.id)||!sourceConnector.grant||typeof sourceConnector.fetchListings!=='function')fail('trusted_source_connector_required');
 const buyers=new Map(),listings=new Map(),audit=[],source=clone(sourceConnector.grant);
 const access=async(actor,scope)=>{if(!has(actor?.subject)||await authorize({actor,scope})!==true)fail('not_authorized')};
 const log=(operation,id,count)=>audit.push({operation,id,at:clock(),count});
 const options=()=>({now:clock(),source});
 return Object.freeze({
  async upsertBuyer({actor,buyer}={}){
   await access(actor,'buyer:write');const b=buyerRecord(buyer);
   if(await verifyBuyerAttestation({actor,buyer:clone(b)})!==true)fail('buyer_attestation_not_verified');
   const q=qualifyBuyerForContact(b,{now:clock()});if(!q.qualified)fail('buyer_not_qualified:'+q.blockers.join(','));
   buyers.set(b.buyerId,clone(b));log('buyer_upsert',b.buyerId,1);
   return {buyerId:b.buyerId,stored:true,personalDataStored:false};
  },
  async suppressBuyer({actor,buyerId}={}){
   await access(actor,'buyer:write');const b=buyers.get(buyerId);if(!b)fail('buyer_not_found');
   b.suppressed=true;b.consent.withdrawn=true;buyers.set(buyerId,b);
   log('buyer_optout',buyerId,1);return {buyerId,suppressed:true};
  },
  async buyerSummaries({actor}={}){
   await access(actor,'buyer:read');
   return [...buyers.values()].map(b=>qualifyBuyerForContact(b,{now:clock()})).filter(q=>q.qualified)
     .map(q=>({buyerId:q.buyerId,markets:q.markets,assetTypes:q.assetTypes,maxAllInUsd:q.verifiedMaximumUsd}));
  },
  async refreshListingFeed({actor,limit=50}={}){
   await access(actor,'listing:write');
   if(!Number.isInteger(limit)||limit<1||limit>100)fail('feed_limit_invalid');
   if(await verifySourceGrant({actor,source:clone(source),connectorId:sourceConnector.id})!==true)fail('feed_authorization_not_verified');
   const received=await sourceConnector.fetchListings({limit,mode:'read_only'});
   if(!Array.isArray(received)||received.length>limit)fail('feed_response_invalid');
   const rejected=[];let accepted=0;
   for(const raw of received){
    try{
     const l=listingRecord(raw);
     const q=checkListingDataRights(l,source,options());
     if(!q.allowed){rejected.push({id:l.id,blockers:q.blockers});continue}
     if(await verifyListingAttestation({actor,listing:clone(l),source:clone(source)})!==true){
      rejected.push({id:l.id,blockers:['listing_attestation_not_verified']});continue;
     }
     listings.set(l.id,clone(l));accepted++;
    }catch(error){rejected.push({id:has(raw?.id)?str(raw.id,100):null,blockers:[error.code||'invalid_source_record']})}
   }
   log('feed_refresh',sourceConnector.id,accepted);
   return {sourceId:sourceConnector.id,readOnly:true,accepted,rejected,totalListings:listings.size};
  },
  async listingSummaries({actor}={}){
   await access(actor,'listing:read');
   return [...listings.values()].map(l=>({id:l.id,address:l.address,market:l.market,
     status:l.listingStatus,daysOnMarket:l.daysOnMarket,listPriceUsd:l.listPriceUsd,sourceUrl:l.sourceUrl}));
  },
  async previewMatches({actor,listingId,subject,sales,costs,valuationReviewRef,repairEvidenceRef,termsPolicyRef}={}){
   await access(actor,'deal:read');const l=listings.get(listingId);
   if(!l)fail('verified_listing_not_found');
   const rights=checkListingDataRights(l,source,options());
   if(!rights.allowed)return {listingId,status:'blocked',blockers:rights.blockers,matches:[]};
   if(await verifySoldSales({actor,listing:clone(l),subject:clone(subject),sales:clone(sales)})!==true)fail('sale_data_attestation_not_verified');
   if(await verifyUnderwriting({actor,listing:clone(l),costs:clone(costs),valuationReviewRef,repairEvidenceRef,termsPolicyRef})!==true)fail('underwriting_attestation_not_verified');
   const valuation=evaluateSoldComps(subject,sales,{now:clock()});
   if(valuation.status!=='provisional_not_appraisal')return {listingId,status:'blocked',blockers:valuation.blockers,matches:[]};
   const o={...options(),valuationReviewRef,repairEvidenceRef,termsPolicyRef},matches=[];
   for(const buyer of buyers.values()){
    if(!qualifyBuyerForContact(buyer,{now:clock()}).qualified)continue;
    const q=calculateBuyerFirstCeiling({listing:l,buyer,valuation,costs},o);
    if(q.status!=='indicative_buyer_first_ceiling')continue;
    const desk=toBuyerFirstDealDeskRecord({listing:l,buyer,valuation,costs,source},o);
    matches.push({buyerId:buyer.buyerId,maximumSellerContractPriceUsd:q.maximumSellerContractPriceUsd,
      potentialNetAssignmentFeeUsd:q.estimatedNetAssignmentFeeUsd,
      dealDeskOpportunity:desk.opportunity});
   }
   matches.sort((a,b)=>b.maximumSellerContractPriceUsd-a.maximumSellerContractPriceUsd||a.buyerId.localeCompare(b.buyerId));
   log('match_preview',listingId,matches.length);
   return {listingId,status:'research_review_only',matches,
    note:'Unsent, uncontracted and unpaid. No seller acceptance, binding terms, escrow or buyer commitment.'};
  },
  async auditSummary({actor}={}){await access(actor,'audit:read');return clone(audit)}
 });
}
