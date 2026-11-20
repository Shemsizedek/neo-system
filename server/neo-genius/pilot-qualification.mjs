/**
 * NEO-GENIUS-005 — commercial-pilot qualification, intentionally READ-ONLY.
 * Property listings and operator statements are NOT title, cap-rate, or financing verification.
 * A token's on-chain existence is NOT legal proof of equity. No securities, loans or government bids.
 */
const webRef = value => typeof value==='string' && /^https:\/\//.test(value);
const finitePositive = value => typeof value==='number' && Number.isFinite(value) && value>0;
const required = (condition, gap, gaps) => { if(!condition) gaps.push(gap); };
const base = (kind,id,gaps,flags={}) => Object.freeze({
 schema:'neo-genius-005/qualification-v1', kind, id,
 status:gaps.length===0?'document-pack-review-required':'evidence-incomplete',
 gaps:Object.freeze([...gaps]),
 ...flags,
 approved:false, investmentReady:false, governmentContractEligible:false,
 note:'Automated screen only. Qualified counsel and authorized counterparty/agency review required before any binding act.'
});
export function screenMultifamilyProperty(p={}) {
 const gaps=[];
 const screen=Number.isInteger(p.units)&&p.units>=20 && finitePositive(p.statedCapRatePct)&&p.statedCapRatePct>=4;
 required(screen,'20+ units and seller-stated cap >=4% not both established',gaps);
 required(finitePositive(p.askingPriceUsd),'Dated supported asking price',gaps);
 required(webRef(p.listingUrl),'Working source URL',gaps);
 const verified=p.verifiedDocuments||{};
 for(const doc of ['ownerAuthority','siteControl','titleCommitment','survey','rentRoll','trailing12','taxHistory','insuranceQuote','floodReview','developerCapacity','financingCommitments']){
   required(typeof verified[doc]==='string' && verified[doc].startsWith('VERIFIED:'),'Independently authenticated '+doc,gaps);
 }
 return base('multifamily-property',String(p.id||'unknown'),gaps,{
  preliminaryBuyBoxMatch:screen,
  sellerCapRatePct:finitePositive(p.statedCapRatePct)?p.statedCapRatePct:null,
  actualNoiVerified:false,
  publicAssistanceEligible:false,
  governmentGrantApplicationReady:false
 });
}
export function screenOrangeChipIssuer(p={}) {
 const gaps=[],docs=p.verifiedDocuments||{};
 for(const doc of ['entityGoodStanding','ownerAuthority','signedResolution','capTable','shareRights','counterpartyAssetProvenance','securityClassificationMemo','offeringRoute','transferRestrictions','independentLegalReview']){
  required(typeof docs[doc]==='string' && docs[doc].startsWith('VERIFIED:'),'Independently authenticated '+doc,gaps);
 }
 return base('orange-chip-issuer',String(p.id||'unknown'),gaps,{
  assetName:String(p.assetName||'unassigned'),
  legalEquityEstablished:false,
  issuerOwnershipEstablished:false,
  offeringAuthorized:false,
  transferEnabled:false,
  secondaryTradingAuthorized:false
 });
}
export function screenGovernmentDemo(p={}) {
 const gaps=[],docs=p.verifiedDocuments||{};
 for(const doc of ['readOnlyCodeReview','unitTests','externalBitcoinData','reconciliationVarianceTest','securityThreatModel','dataClassification','publicClaimsReview','agencyPilotScope']){
  required(typeof docs[doc]==='string' && docs[doc].startsWith('VERIFIED:'),'Independently authenticated '+doc,gaps);
 }
 return base('government-reserve-demo',String(p.id||'NEO-eGaaS'),gaps,{
  readOnly:true, privateKeyAccess:false, independentCustodyAttestation:false,
  publicReserveBalanceCertified:false, texasVendorCredentialVerified:false,
  governmentEndorsement:false
 });
}
