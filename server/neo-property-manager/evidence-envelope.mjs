/**
 * NEO Property Manager / NCC-015 synthetic-first evidence envelope.
 * No network, keys, wallets, signing, property access, or official records are modified.
 * Data is provenance only. Title, lien, service, consent never inferred.
 */
import { createHash, randomBytes } from 'node:crypto';

const sourceClasses = new Set([
  'COUNTY_RECORD','TITLE_REPORT','SURVEY','COURT_FILING','COURT_ORDER',
  'OWNER_NOTICE','SERVICE_PROOF','MAINTENANCE_RECORD','MANAGEMENT_AGREEMENT',
  'CES_JOURNAL','BITCOIN_BROADCAST','COUNTERPARTY_EVENT','CUSTODY_RECEIPT',
  'MORTGAGE','REGULATORY_RECORD','PHOTO','OTHER'
]);
export const EVIDENCE_CLASSES = Object.freeze([...sourceClasses]);
export const LEGAL_EFFECTS = Object.freeze([
  'ASSERTED_ONLY','RECORD_FILED','PUBLICATION_OBSERVED','INTERNAL_LEDGER_POSTED',
  'EXTERNALLY_VERIFIED','LEGAL_REVIEW_REQUIRED'
]);
function sortValue(v) {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === 'object' && !Buffer.isBuffer(v))
    return Object.fromEntries(Object.keys(v).sort().map(k=>[k,sortValue(v[k])]));
  return v;
}
export const canonical = value => JSON.stringify(sortValue(value));
export const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
const hex64 = x => typeof x==='string' && /^[a-f0-9]{64}$/i.test(x);
const required = (value,name) => { if (typeof value !== 'string' || !value) throw new Error(name+' required'); };

export function evidenceEvent(input) {
  required(input.assetRef,'assetRef');
  required(input.eventId,'eventId');
  required(input.sourceRef,'sourceRef');
  required(input.occurredAt,'occurredAt');
  if (!sourceClasses.has(input.sourceClass)) throw new Error('invalid sourceClass');
  if (!hex64(input.contentHash)) throw new Error('contentHash must be sha256 hex');
  if (Number.isNaN(Date.parse(input.occurredAt))) throw new Error('invalid occurredAt');
  if (!LEGAL_EFFECTS.includes(input.legalEffect)) throw new Error('invalid legalEffect');
  if (!['RESTRICTED','PUBLIC_REDACTED'].includes(input.access)) throw new Error('invalid access classification');
  const {assetRef,eventId,sourceRef,sourceClass,occurredAt,contentHash,legalEffect,access,linkedEventId=null}=input;
  return Object.freeze({schema:'neo.property.evidence.v1',assetRef,eventId,sourceRef,sourceClass,occurredAt,contentHash:contentHash.toLowerCase(),legalEffect,access,linkedEventId});
}

export function verifyChain(entries) {
  if (!Array.isArray(entries)) return false;
  let prior='GENESIS';
  for (let i=0;i<entries.length;i++) {
    const e=entries[i];
    if (e.index!==i || e.previousHash!==prior || e.entryHash!==sha256({index:i,previousHash:prior,event:e.event})) return false;
    prior=e.entryHash;
  }
  return true;
}
export function appendEvent(existing,event) {
  if (!Array.isArray(existing)) throw new Error('ledger must be array');
  if (existing.some(e=>e.event.eventId===event.eventId)) throw new Error('duplicate event ID');
  if (!verifyChain(existing)) throw new Error('ledger integrity failure');
  const previousHash=existing.at(-1)?.entryHash ?? 'GENESIS';
  const index=existing.length;
  const entry=Object.freeze({index,previousHash,event,entryHash:sha256({index,previousHash,event})});
  return Object.freeze([...existing,entry]);
}

/** Publish a nonce-based commitment, never private source references or case files. */
export function preparePublicCommitment(ledger,nonce=randomBytes(32).toString('hex')) {
  if (!ledger.length || !verifyChain(ledger)) throw new Error('valid nonempty ledger required');
  if (!hex64(nonce)) throw new Error('private nonce must be 32 bytes hex');
  const head=ledger.at(-1).entryHash;
  return Object.freeze({
    publicReceipt:Object.freeze({schema:'neo.crown.commitment.v1',commitment:sha256('NEO-CROWN-v1:'+head+':'+nonce),evidenceCount:ledger.length,publicationStatus:'NOT_PUBLISHED'}),
    privateVerification:Object.freeze({head,nonce})
  });
}
export function verifyCommitment(publicReceipt,privateVerification) {
  if (!hex64(privateVerification?.head) || !hex64(privateVerification?.nonce)) return false;
  return publicReceipt?.commitment===sha256('NEO-CROWN-v1:'+privateVerification.head+':'+privateVerification.nonce);
}

export function acquisitionState({verifiedDeed=false,authorizedControl=false,courtOrderAuthorizesEntry=false,authorizedManagementContract=false}={}) {
  const control=(verifiedDeed && authorizedControl) || courtOrderAuthorizesEntry;
  return Object.freeze({
    evidenceIngestion:true,
    nonBindingOutreach:true,
    publishSanitizedReceipt:true,
    titleConfirmed:Boolean(verifiedDeed),
    propertyEntryAuthorized:Boolean(control),
    managementOperationsAuthorized:Boolean(control && authorizedManagementContract),
    issuePropertyBackedInstrument:false
  });
}
