/**
 * NEO Property Manager — NCC-019 read-only source acceptance.
 * Purpose: keep entity/title/foreclosure/plat/public-record assertions separate
 * from verified instruments. No outside requests, filings, token minting, or site control.
 */
import { createHash } from 'node:crypto';

export const SOURCE_FAMILIES = Object.freeze([
  'HCAD_APPRAISAL','TX_COMPTROLLER_ENTITY','TX_SOS_ENTITY',
  'HARRIS_COUNTY_DEED','HARRIS_COUNTY_FORECLOSURE','HARRIS_TAX_ACCOUNT',
  'HOUSTON_PIA_RECORD','HOUSTON_PLAT_APPLICATION','RECORDED_PLAT',
  'LENDER_NOTICE','COMPANY_CORRESPONDENCE'
]);
export const REGULATED_RESULTS = Object.freeze([
  'TITLE_ESTABLISHED','FORECLOSURE_CONFIRMED','CONTROLLER_AUTHORIZED',
  'PROPERTY_ENTRY_AUTHORIZED','LENDER_RIGHT_ACQUIRED'
]);
const sha256=v=>createHash('sha256').update(v).digest('hex');
const assertText=(v,k)=>{if(typeof v!=='string'||!v.trim())throw new Error(k+' required');return v.trim()};
const assertHash=h=>{if(typeof h!=='string'||!/^[a-f0-9]{64}$/i.test(h))throw new Error('valid source SHA-256 expected');return h.toLowerCase()};

/** Accept a source document and digest, not a claimant-declared legal conclusion. */
export function captureReadOnlySource({
  assetRef, eventId, sourceFamily, sourceReference, sourceBytes, capturedAt,
  observedAt, claimedParties=[], declaredDocumentType='OTHER', providerMessageId=null,
  sourceCustodian='UNCONFIRMED'
}={}){
  assertText(assetRef,'assetRef');assertText(eventId,'eventId');
  assertText(sourceReference,'sourceReference');assertText(capturedAt,'capturedAt');
  if(!SOURCE_FAMILIES.includes(sourceFamily))throw new Error('invalid source family');
  if(!Buffer.isBuffer(sourceBytes) || sourceBytes.length===0)throw new Error('original source bytes required');
  if(Number.isNaN(Date.parse(capturedAt)))throw new Error('invalid capture date');
  if(observedAt!==undefined && observedAt!==null && Number.isNaN(Date.parse(observedAt)))
    throw new Error('invalid observed date');
  if(!Array.isArray(claimedParties)||claimedParties.some(x=>typeof x!=='string'))
    throw new Error('claimedParties must be strings');
  return Object.freeze({
    schema:'neo.pm.readonly-source.v1',assetRef,eventId,sourceFamily,sourceReference,
    documentSha256:sha256(sourceBytes),documentByteCount:sourceBytes.length,capturedAt,
    observedAt:observedAt??null,declaredDocumentType,claimedParties:[...claimedParties],
    providerMessageId,sourceCustodian,
    hashVerified:true,sourceOriginAuthentication:'NEEDS_INDEPENDENT_CHECK',
    certifiedInstrumentVerified:false,corporateControllerVerified:false,
    officialDistressVerified:false,legalEffect:'SOURCE_CONTENTS_ONLY',
    titleTransferred:false,managementAuthorized:false,possessoryRightCreated:false
  });
}
/**
 * Source digests are compared to the original bytes in the private vault.
 * A matching digest confirms byte integrity, not official authenticity.
 */
export function checkReceiptAgainstBytes(receipt,bytes){
  if(receipt?.schema!=='neo.pm.readonly-source.v1' || !Buffer.isBuffer(bytes))return false;
  return assertHash(receipt.documentSha256)===sha256(bytes)&&receipt.documentByteCount===bytes.length;
}
/** Verify corporate outreach domain against actual *named* business. */
export function correctCounterpartyChannel({companyName,email,officialSourceUrl}={}){
  assertText(companyName,'companyName');assertText(email,'email');assertText(officialSourceUrl,'officialSourceUrl');
  const domain=email.split('@')[1]?.toLowerCase();
  const url=new URL(officialSourceUrl);
  const exact=companyName==='TeraWatt Infrastructure' && domain==='terawattinfrastructure.com'
    && ['www.terawattinfrastructure.com','terawattinfrastructure.com'].includes(url.hostname);
  return Object.freeze({channelMatched:Boolean(exact),entityControlEstablished:false,
    appropriateAction:exact?'CONFIRM_AUTHORIZED_PROPERTY_REPRESENTATIVE':'DO_NOT_ASSUME_AFFILIATION'});
}
/** A public posting, official-looking PDF or appraisal entry does not grant control. */
export function acquisitionReviewStatus(records=[]){
  if(!Array.isArray(records)||records.some(x=>x?.schema!=='neo.pm.readonly-source.v1'))
    throw new Error('source receipts expected');
  const byKind=new Set(records.map(r=>r.sourceFamily));
  const hasPropertySource=byKind.has('HCAD_APPRAISAL')||byKind.has('HARRIS_COUNTY_DEED');
  const hasDistressSource=byKind.has('HARRIS_COUNTY_FORECLOSURE')||byKind.has('HARRIS_TAX_ACCOUNT')||byKind.has('HOUSTON_PIA_RECORD');
  return Object.freeze({
    primaryPublicSourceLead:hasPropertySource,
    foreclosureOrDistressSourcePresent:hasDistressSource,
    certifiedCountyDeedVerified:false,actualCurrentForeclosureVerified:false,
    lenderDebtAvailableForPurchase:false,beneficialControllerIdentified:false,
    possessionPeriodStartedByThisTool:false,propertyEntryAllowed:false,
    legalEffect:'NONE_INFERRED',nextAction:'QUALIFY_SIGNING_AUTHORITY_AND_RECORDED_INSTRUMENT'
  });
}
