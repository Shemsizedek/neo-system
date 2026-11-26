/**
 * NEO-PM-002 / NCC-016: evidence-first acquisition administration.
 * Data is evidence, not title. This module performs no entry, filings or money movement.
 */
import { createHash } from 'node:crypto';
import { evidenceEvent, appendEvent } from './evidence-envelope.mjs';

export const ROUTES = Object.freeze([
  'UNSOLICITED_PURCHASE','MEMBERSHIP_INTEREST_PURCHASE','DISTRESSED_DEBT_PURCHASE',
  'AUTHORIZED_TAX_OR_JUDICIAL_SALE','DEVELOPMENT_JV','PROPERTY_MANAGEMENT_MANDATE',
  'ADVERSE_POSSESSION_FACT_REVIEW'
]);
export const INTEGRATIONS = Object.freeze({
  'NEO Pads':['occupancy','authorized maintenance','resident service requests'],
  'NEO Realty':['source-backed title','offer','underwriting'],
  'Smart Realty':['building equipment','service history','safety inspections'],
  'NEO Deal Desk':['counterparty qualification','approval','nonbinding proposal'],
  'NEO Crown Chain':['source hashes','CES reference','Bitcoin public commitment'],
  'Government API':['official deed record reference','permit','code violation status']
});
const docTypes = new Set([
  'OWNER_IDENTITY','COUNTY_DEED','TITLE_COMMITMENT','SURVEY','CONDITION_REPORT',
  'CITY_CODE_OR_PERMIT','PUBLIC_LISTING','OWNER_INQUIRY','DELIVERY_PROOF','NONRESPONSE_LOG',
  'COURT_ORDER','AGREEMENT','PROPERTY_MANAGEMENT_CONTRACT','CES_JOURNAL',
  'BITCOIN_PUBLICATION','PUBLIC_REGISTER_RECEIPT','MAINTENANCE_WORK_ORDER'
]);
const clean = s=>typeof s==='string' && s.trim().length>0;
const unique=a=>Array.from(new Set(a));
export function classifyAdministrativeSource(input){
  if(!input || !clean(input.documentId) || !docTypes.has(input.type) || !clean(input.sourceRef))
    throw new Error('invalid document identification');
  if(!/^[a-f\d]{64}$/i.test(input.sha256||'')) throw new Error('source sha256 required');
  const delivered=Boolean(input.recipientVerified && input.deliveryEvidenceId);
  const published=Boolean(input.publicationTxid && /^[a-f\d]{64}$/i.test(input.publicationTxid));
  return Object.freeze({
    documentId:input.documentId,type:input.type,sourceRef:input.sourceRef,
    sourceHash:input.sha256.toLowerCase(),contentsAuthenticated:input.contentsAuthenticated===true,
    deliveredToNamedRecipient:delivered,receiptEvidenceId:delivered?input.deliveryEvidenceId:null,
    ownerAcknowledgment:Boolean(input.ownerAcknowledgmentId),silenceObserved:input.nonresponseObserved===true,
    publicationEvidence:published,publicationTxid:published?input.publicationTxid:null,
    titleTransferred:false,consentEstablished:false,legalServiceEstablished:false,
    verification:'EVIDENCE_ONLY'
  });
}
/** Inactivity evidence supports outreach/research, never unilateral seizure or title. */
export function classifyDistress(signals={}){
  const observed=unique([
    ...(signals.publicCodeRecordVerified?['PUBLIC_CODE_RECORD']:[]),
    ...(signals.propertyTaxDelinquencyVerified?['TAX_DELINQUENCY_RECORD']:[]),
    ...(signals.officialForeclosureNoticeVerified?['FORECLOSURE_NOTICE']:[]),
    ...(signals.privateVacancyObservation?['PRIVATE_VACANCY_OBSERVATION']:[]),
    ...(signals.utilityNotice?['UTILITY_NOTICE']:[])
  ]);
  const official=observed.filter(x=>['PUBLIC_CODE_RECORD','TAX_DELINQUENCY_RECORD','FORECLOSURE_NOTICE'].includes(x));
  return Object.freeze({signals:observed,officialSignals:official,
    classification:official.length?'OFFICIAL_DISTRESS_REVIEW':'UNVERIFIED_DISTRESS_LEAD',
    ownerAbandonedTitle:false,rightToEnter:false,adversePossessionEstablished:false});
}
/** Reaching HUMAN_REVIEW_READY is not legal approval or property access authorization. */
export function qualifyAcquisition(input={}){
  if(!ROUTES.includes(input.route))throw new Error('invalid acquisition route');
  const missing=[];
  if(!input.parcelIdentityVerified)missing.push('OFFICIAL_PARCEL_IDENTITY');
  if(!input.ownerOrAdversePartyIdentified)missing.push('PARTY_IDENTITY');
  if(input.route==='ADVERSE_POSSESSION_FACT_REVIEW'){
    if(!input.possessionEvidenceAuthenticated)missing.push('FACTUAL_POSSESSION_EVIDENCE');
    if(!input.periodAndContinuityEvidenceAuthenticated)missing.push('PERIOD_CONTINUITY_EVIDENCE');
    if(!input.qualifiedCounselReviewed)missing.push('COUNSEL_ASSESSMENT');
  }else if(input.route==='AUTHORIZED_TAX_OR_JUDICIAL_SALE'){
    if(!input.officialSaleNoticeAuthenticated)missing.push('OFFICIAL_SALE_NOTICE');
  }else if(input.route==='PROPERTY_MANAGEMENT_MANDATE'){
    if(!input.signedManagerAuthorityVerified)missing.push('SIGNED_MANAGEMENT_AUTHORITY');
    if(!input.regulatedFunctionsCleared)missing.push('LICENSE_SCOPE_REVIEW');
  }else{
    if(!input.counterpartyAuthorityVerified)missing.push('SELLER_OR_AGENT_AUTHORITY');
  }
  return Object.freeze({route:input.route,missingEvidence:missing,
    nextState:missing.length?'EVIDENCE_COLLECTION':'HUMAN_REVIEW_READY',
    titleConfirmed:false,entryAuthorized:false,managementActive:false,
    canDraftNonbindingOutreach:true,canFileOwnershipNotice:false,
    canExecuteBindingTransfer:false,canRecordLien:false});
}
/** Append SHA-256 digest of original bytes to NCC-015 chain. */
export function appendAdministrativeEvidence(ledger,{assetRef,eventId,documentId,sourceRef,sourceClass,occurredAt,sourceBytes}){
  if(!Buffer.isBuffer(sourceBytes))throw new Error('unmodified source bytes required');
  if(!clean(documentId))throw new Error('documentId required');
  const hash=createHash('sha256').update(sourceBytes).digest('hex');
  const event=evidenceEvent({assetRef,eventId,sourceRef,sourceClass,
    occurredAt,contentHash:hash,legalEffect:'ASSERTED_ONLY',access:'RESTRICTED'});
  return appendEvent(ledger,event);
}
