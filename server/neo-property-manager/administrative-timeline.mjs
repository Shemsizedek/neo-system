/**
 * NEO Property Manager / NCC-022 - Two-clock administrative acquisition register.
 * A dated case/open-records chronology is NOT a statutory adverse-possession clock.
 * No property access, service, foreclosure, title, debt, or lien effect is conferred.
 */
export const EVENT_TYPES=Object.freeze([
  'CASE_INTAKE','RECORDS_REQUEST','BROKER_INQUIRY','POTENTIAL_BUYER_INQUIRY',
  'OWNER_DIRECTED_CORRESPONDENCE','DELIVERY_CONFIRMATION','PUBLIC_POST',
  'PHYSICAL_POSSESSION_EVIDENCE','MUNICIPAL_INSPECTION','RECORDED_DEED',
  'SIGNED_AGREEMENT','COURT_ORDER','AGENCY_RESPONSE'
]);
const dateIso=v=>typeof v==='string' && !Number.isNaN(Date.parse(v)) && /(?:Z|[+-]\d\d:\d\d)$/.test(v);
function nonblank(v,k){if(typeof v!=='string'||!v.trim())throw new Error(k+' required');return v.trim();}
export function createAcquisitionEvent({eventId,assetRef,kind,occurredAt,loggedAt,
 sourceRef,evidenceHash=null,addressee=null,deliveredProofRef=null,
 actualPossessionVerified=false,legalReviewRef=null,notes='' }={}){
  nonblank(eventId,'eventId');nonblank(assetRef,'assetRef');
  nonblank(sourceRef,'sourceRef');
  if(!EVENT_TYPES.includes(kind))throw new Error('unsupported event kind');
  if(!dateIso(occurredAt)||!dateIso(loggedAt))throw new Error('offset-aware occurredAt and loggedAt required');
  if(evidenceHash!==null && !/^[0-9a-f]{64}$/i.test(evidenceHash))throw new Error('bad evidence hash');
  if(actualPossessionVerified===true && kind!=='PHYSICAL_POSSESSION_EVIDENCE')
    throw new Error('possession flag without possession event');
  return Object.freeze({schema:'neo.pm.admin-event.v1',eventId,assetRef,kind,occurredAt,loggedAt,
    sourceRef,evidenceHash,addressee,deliveredProofRef,actualPossessionVerified,
    legalReviewRef,notes});
}
/**
 * This function returns a historical administrative chronology.
 * It cannot conclude that a legal notice was served or statutory possession began.
 */
export function summarizeAdministrativeChronology(events=[],asOf){
 if(!Array.isArray(events)||events.some(e=>e?.schema!=='neo.pm.admin-event.v1'))
  throw new Error('validated administrative events required');
 if(!dateIso(asOf))throw new Error('offset-aware asOf required');
 const seen=new Set();for(const e of events){if(seen.has(e.eventId))throw new Error('duplicate eventId');seen.add(e.eventId)}
 const sorted=[...events].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt));
 const first=kind=>sorted.find(e=>kind.includes(e.kind))??null;
 const intake=first(['CASE_INTAKE']);
 const outbound=first(['RECORDS_REQUEST','BROKER_INQUIRY','POTENTIAL_BUYER_INQUIRY','OWNER_DIRECTED_CORRESPONDENCE']);
 const ownerNotice=sorted.find(e=>e.kind==='OWNER_DIRECTED_CORRESPONDENCE'&&e.addressee&&e.deliveredProofRef)??null;
 const possessionLead=sorted.find(e=>e.kind==='PHYSICAL_POSSESSION_EVIDENCE'
   && e.actualPossessionVerified && e.legalReviewRef)??null;
 const dayDiff=t=>t?Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(t.occurredAt))/86400000)):null;
 return Object.freeze({
  schema:'neo.pm.admin-chronology.v1',eventCount:sorted.length,
  intakeStartedAt:intake?.occurredAt??null,
  externalInquiryStartedAt:outbound?.occurredAt??null,
  ownerDirectedNoticeWithDeliveryEvidenceAt:ownerNotice?.occurredAt??null,
  administrativeElapsedDays:dayDiff(intake),
  ownerNoticeServiceLegallyEffective:'UNDETERMINED',
  potentialActualPossessionEvidenceAt:possessionLead?.occurredAt??null,
  statutoryAdversePossessionStartAt:null,
  statutoryAdversePossessionClock:'NOT_ESTABLISHED_BY_SOFTWARE',
  propertyEntryAuthorized:false,managementAuthorityEstablished:false,
  ownerConsentFromNonresponse:false,
  titleTransferred:false
 });
}
