/**
 * NEO Property Manager / NCC-020 — private-source reviewer attestation.
 * Verifies PDF-byte integrity and a signature by a separately enrolled reviewer.
 * A reviewer attests their inspection, not government custody, title, possession,
 * debt priority, or legal service. Never writes to Bitcoin or another system.
 */
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalize = obj => Array.isArray(obj)
  ? obj.map(canonicalize)
  : obj && typeof obj === 'object'
    ? Object.fromEntries(Object.keys(obj).sort().map(k=>[k,canonicalize(obj[k])]))
    : obj;
export const canonicalBytes = obj => Buffer.from(JSON.stringify(canonicalize(obj)), 'utf8');
const text = v => typeof v === 'string' && v.trim().length > 0;
const hex64 = v => typeof v === 'string' && /^[0-9a-f]{64}$/i.test(v);

export function stageReviewerAttestation({sourceReceipt,sourceBytes,reviewerId,reviewedAt,reviewScope='SOURCE_BYTE_INTEGRITY'}={}){
  if(sourceReceipt?.schema!=='neo.pm.hcad-receipt.v1') throw new Error('validated HCAD source receipt required');
  if(!Buffer.isBuffer(sourceBytes)||sourceBytes.length===0) throw new Error('original source bytes required');
  if(hash(sourceBytes)!==sourceReceipt.sourceHash || sourceBytes.length!==sourceReceipt.originalByteCount)
    throw new Error('source digest mismatch');
  if(!text(reviewerId)||!text(reviewedAt)||Number.isNaN(Date.parse(reviewedAt)))
    throw new Error('reviewer/time required');
  if(!['SOURCE_BYTE_INTEGRITY','SOURCE_BYTES_AND_EMAIL_PROVENANCE_REVIEW'].includes(reviewScope))
    throw new Error('invalid review scope');
  return Object.freeze({
    schema:'neo.crown.private-review-attestation.v1',
    sourceSchema:sourceReceipt.schema,assetRef:sourceReceipt.assetRef,
    sourceAccount:sourceReceipt.account,sourceDigest:sourceReceipt.sourceHash,
    sourceByteCount:sourceReceipt.originalByteCount,
    sourceMailboxReference:sourceReceipt.sourceMailboxReference,
    reviewerId,reviewedAt,reviewScope,
    legalEffect:'NONE_INFERRED', titleVerified:false, managementAuthorized:false,
    custodyOrCustodianSignatureVerified:false, bitcoinPublished:false,
    ownerIdentityVerified:false
  });
}
/** A registry, not this claim's supplied key, determines permitted reviewers. */
export function verifyReviewerSignature({attestation,signatureBase64,trustedReviewers}={}){
  if(attestation?.schema!=='neo.crown.private-review-attestation.v1') return false;
  if(!text(signatureBase64)||!trustedReviewers||typeof trustedReviewers!=='object') return false;
  const enrolled=Object.hasOwn(trustedReviewers,attestation.reviewerId)
    ? trustedReviewers[attestation.reviewerId] : undefined;
  if(!enrolled || enrolled.role!=='records-reviewer' || enrolled.enabled!==true || !text(enrolled.publicKeyPem))
    return false;
  try{
    const sig=Buffer.from(signatureBase64,'base64');
    if(sig.length!==64) return false;
    return verifySignature(null,canonicalBytes(attestation),createPublicKey(enrolled.publicKeyPem),sig);
  }catch{return false}
}
/** Only an opaque commitment may be shared; it is not automatically published. */
export function stageRedactedCommitment({attestation,secretNonce}={}){
  if(attestation?.schema!=='neo.crown.private-review-attestation.v1'||!hex64(secretNonce))
    throw new Error('private attestation and nonce required');
  return Object.freeze({
    schema:'neo.crown.redacted-review-receipt.v1',
    commitment:hash(Buffer.concat([canonicalBytes(attestation),Buffer.from(secretNonce,'hex')])),
    status:'NOT_PUBLISHED', legalEffect:'NONE_INFERRED'
  });
}
export function verifyRedactedCommitment({receipt,attestation,secretNonce}={}){
  try{return receipt?.commitment===stageRedactedCommitment({attestation,secretNonce}).commitment
    && receipt.status==='NOT_PUBLISHED';}catch{return false}
}
