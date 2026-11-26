/**
 * NCC-018: read-only HCAD source-adapter test gate.
 * No government authentication, title warranty or official filing is implied by this module.
 * Source bytes and sensitive pages remain in a private evidence vault outside this repository.
 */
import { createHash } from 'node:crypto';
import { evidenceEvent, appendEvent, preparePublicCommitment } from './evidence-envelope.mjs';

export const PILOT_PARCELS = Object.freeze({
  '0772210030001':Object.freeze({assetRef:'ALG-2502',address:'2502 Algerian Way',class:'COMMERCIAL_OFFICE'}),
  '0772210020011':Object.freeze({assetRef:'ALG-2504',address:'2504 Algerian Way',class:'MULTIFAMILY'})
});
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function requiredString(value,label) {
  if(typeof value!=='string'||!value.trim())throw new Error(label+' required');
  return value.trim();
}
/**
 * Build a read-only source receipt from PDF bytes received through the user's connected
 * HCAD email. An external human/vault adapter must check the document's origin; parsing
 * assertions are kept independent. "HCAD" source attribution alone never authenticates a
 * custodian signature or county deed.
 */
export function captureAppraisalRecord({account,sourceBytes,sourceMailboxReference,receivedAt,
  reportedOwner,reportedOwnerEffectiveDate,reportedAppraisedValue,year=2026}={}){
  const parcel=PILOT_PARCELS[account];
  if(!parcel)throw new Error('not a pilot HCAD account');
  if(!Buffer.isBuffer(sourceBytes)||sourceBytes.length<100||
     sourceBytes.subarray(0,5).toString()!=='%PDF-')throw new Error('original PDF bytes required');
  requiredString(sourceMailboxReference,'sourceMailboxReference');
  requiredString(receivedAt,'receivedAt');
  requiredString(reportedOwner,'reportedOwner');
  requiredString(reportedOwnerEffectiveDate,'reportedOwnerEffectiveDate');
  if(!Number.isFinite(reportedAppraisedValue)||reportedAppraisedValue<0)
    throw new Error('appraised value must be a nonnegative number');
  if(year!==2026)throw new Error('pilot year must be 2026');
  if(Number.isNaN(Date.parse(receivedAt)))throw new Error('receivedAt invalid');
  return Object.freeze({
    schema:'neo.pm.hcad-receipt.v1',source:'HCAD_PUBLIC_INFORMATION_RESPONSE',
    assetRef:parcel.assetRef,account,year,sourceHash:digest(sourceBytes),
    originalByteCount:sourceBytes.length,sourceMailboxReference,
    receivedAt,reportedOwner,reportedOwnerEffectiveDate,reportedAppraisedValue,
    sourceBytesRetainedInPrivateVault:false,extractor:'HUMAN_REVIEWED_SOURCE_TEXT',
    signedCustodianAuthentication:'NOT_VERIFIED',titleConclusion:'NOT_VERIFIED',
    encumbrancesVerified:false,recordingInstrumentVerified:false,
    entryAuthorized:false,managementAuthorized:false,publicPublication:'NOT_PUBLISHED'
  });
}
/** Convert a captured source into one restricted Crown event; no external writes. */
export function linkHCADToCrown({ledger=[],receipt,eventId}={}){
  if(receipt?.schema!=='neo.pm.hcad-receipt.v1')throw new Error('validated receipt required');
  requiredString(eventId,'eventId');
  const event=evidenceEvent({
    assetRef:receipt.assetRef,eventId,
    sourceRef:'hcad:response:'+receipt.account+':'+receipt.year,
    sourceClass:'COUNTY_RECORD',occurredAt:receipt.receivedAt,
    contentHash:receipt.sourceHash,legalEffect:'ASSERTED_ONLY',access:'RESTRICTED'
  });
  return appendEvent(ledger,event);
}
/** Produces *unpublished*, opaque receipt. No source address, owner or case info is exposed. */
export function stagePublicProof(ledger){
  return preparePublicCommitment(ledger);
}
export function acquisitionSignal(receipt){
  if(receipt?.schema!=='neo.pm.hcad-receipt.v1')throw new Error('validated receipt required');
  return Object.freeze({
    assetRef:receipt.assetRef,sourceReceiptCaptured:true,
    listedOwner:receipt.reportedOwner,
    listedOwnerSource:'HCAD_APPRAISAL_ONLY',
    corporationControllerVerified:false,certifiedDeedVerified:false,
    finalPlatRecorded:false,cityDistressFindingVerified:false,
    propertyEntryAuthorized:false,managementAuthorized:false,
    eligibleAction:'NONBINDING_COUNTERPARTY_RESEARCH'
  });
}
