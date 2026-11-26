/**
 * NCC-023 property-specific acquisition notice packets.
 * No delivery, service, title, possession or debt rights are created.
 * Uses restricted Crown Chain evidence events in the existing evidence envelope.
 */
import { sha256, evidenceEvent, appendEvent } from './evidence-envelope.mjs';

const validTimestamp = v => typeof v==='string' && /(?:Z|[+-]\d\d:\d\d)$/.test(v) && !Number.isNaN(Date.parse(v));
const txt=(v,n)=>{if(typeof v!=='string'||!v.trim())throw new Error(n+' required');return v.trim();};
export const INQUIRY_TYPES = Object.freeze([
  'UNSOLICITED_PURCHASE','REDEVELOPMENT_JV','GROUND_LEASE',
  'CORPORATE_INTEREST_ACQUISITION','QUALIFIED_DEBT_DISCUSSION'
]);

export function preparePropertyInquiry({
  caseId,assetRef,address,listedOwner,ownerRecordSource,preparedAt,
  inquiryType='UNSOLICITED_PURCHASE',preparedBy='NEO Property Manager / Shelton Estate & Co.'
}={}){
  for(const [key,v] of Object.entries({caseId,assetRef,address,listedOwner,ownerRecordSource,preparedBy}))
    txt(v,key);
  if(!validTimestamp(preparedAt))throw new Error('offset-aware preparedAt required');
  if(!INQUIRY_TYPES.includes(inquiryType))throw new Error('unsupported inquiry type');
  const content=[
    'NONBINDING ACQUISITION INTEREST — INFORMATION REQUEST ONLY',
    'Property: '+address,
    'Case reference: '+caseId,
    'To: Authorized real-property representative of '+listedOwner,
    'Sender: '+preparedBy,
    '',
    'We are evaluating an unsolicited opportunity to acquire, finance or redevelop the identified property through an owner-authorized transaction. We request confirmation of the correct decision-maker and whether a confidential exploratory discussion is appropriate.',
    'This letter is not an offer, demand to vacate, property-control notice, lien, claim of current possession, default notice, or request for access. We will not interpret nonresponse as agreement, service of legal process, abandonment, or transfer of title.',
    'Any next step, including property access, management, financing, deeds or agreements, requires separate signed authorization and due diligence.'
  ].join('\n');
  return Object.freeze({
    schema:'neo.pm.property-inquiry.v1',caseId,assetRef,address,listedOwner,
    ownerRecordSource,preparedAt,inquiryType,preparedBy,content,
    contentSha256:sha256(content),status:'DRAFT_UNSENT',
    actualRecipientVerified:false,legalServiceStatus:'NOT_CLAIMED',
    actualPossessionVerified:false,transferOfTitle:false,defaultEstablished:false,
    consentBySilence:false,propertyEntryAllowed:false
  });
}

export function stageInquiryInCrown(ledger=[],packet){
  if(packet?.schema!=='neo.pm.property-inquiry.v1'||packet.status!=='DRAFT_UNSENT')
    throw new Error('draft packet required');
  const event=evidenceEvent({
    assetRef:packet.assetRef,
    eventId:'draft:'+packet.caseId+':'+packet.contentSha256.slice(0,20),
    sourceClass:'OWNER_NOTICE',sourceRef:'private-draft:'+packet.caseId,
    occurredAt:packet.preparedAt,contentHash:packet.contentSha256,
    legalEffect:'ASSERTED_ONLY',access:'RESTRICTED'
  });
  return appendEvent(ledger,event);
}

/**
 * A verification packet cannot be called a served legal notice by this software.
 * A reply and delivery acknowledgement may be stored without assuming owner authority.
 */
export function reconcileDispatch(packet,{recipientIdentityVerified=false,
  recordedSentAt=null,deliveryProofRef=null,replyProofRef=null}={}){
  if(packet?.schema!=='neo.pm.property-inquiry.v1')throw new Error('property inquiry required');
  if(recordedSentAt!==null && !validTimestamp(recordedSentAt))
    throw new Error('offset-aware sentAt required');
  if(recordedSentAt===null && (deliveryProofRef || replyProofRef))
    throw new Error('cannot claim reply or delivery for unsent draft');
  return Object.freeze({
    caseId:packet.caseId,noticeDigest:packet.contentSha256,
    communicationStatus:recordedSentAt?'SENT_REPORTED_NEEDS_PROVENANCE':'DRAFT_UNSENT',
    recipientIdentityVerified:Boolean(recipientIdentityVerified),
    recordedSentAt,deliveryProofRef,replyProofRef,
    legallyEffectiveService:'NOT_DETERMINED',ownershipConsent:false,
    possessionClockStarted:false,managementRightsGranted:false
  });
}
export function reviewOfficialDistressLead({
  caseId,recordType,recordRef,contentDigest,custodianIndependentlyChecked=false
}={}){
  txt(caseId,'caseId');txt(recordRef,'recordRef');
  if(!['CITY_CODE_INSPECTION','TAX_ACCOUNT','RECORDED_FORECLOSURE','RECORDED_DEED','PLAT_APPLICATION'].includes(recordType))
    throw new Error('unknown official record type');
  if(typeof contentDigest!=='string'||!/^[a-f0-9]{64}$/i.test(contentDigest))throw new Error('digest required');
  return Object.freeze({caseId,recordType,recordRef,contentDigest,
    sourceIdentityReviewed:Boolean(custodianIndependentlyChecked),
    recordContentsNeedSeparateAssessment:true,
    actualDistressFindingEstablished:false,abandonmentOfTitle:false,
    adversePossessionEstablished:false,entryAuthorized:false});
}
