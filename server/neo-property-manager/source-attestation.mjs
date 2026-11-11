/**
 * NCC-019: Internal source-custody and reviewer attestation.
 * This does not digitally authenticate an issuing government agency or legal title.
 * All operations are local/read-only; no mainnet publishing or legal filing.
 */
import { createHash, sign, verify } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sha64 = s => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
const allowedOrigins = new Set(['HCAD_EMAIL_ATTACHMENT','COUNTY_CLERK_DOWNLOAD','COURT_FILE_DOWNLOAD','OTHER_PUBLIC_RECORD']);
function requireText(x,field) {
  if (typeof x !== 'string' || !x.trim()) throw new Error(field+' required');
  return x.trim();
}
function canonical(value) {
  if (Array.isArray(value)) return JSON.stringify(value.map(s=>JSON.parse(canonical(s))));
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])));
}
export function captureSourceCustody({assetRef,originalBytes,sourceId,originChannel,importedAt,expectedHash}={}) {
  requireText(assetRef,'assetRef'); requireText(sourceId,'sourceId'); requireText(importedAt,'importedAt');
  if (!allowedOrigins.has(originChannel)) throw new Error('unknown origin channel');
  if (Number.isNaN(Date.parse(importedAt))) throw new Error('invalid import timestamp');
  if (!Buffer.isBuffer(originalBytes) || originalBytes.length<100 ||
      originalBytes.subarray(0,5).toString()!=='%PDF-') throw new Error('original PDF bytes required');
  const sourceHash=hash(originalBytes);
  if (expectedHash!==undefined && (!sha64(expectedHash) || sourceHash!==expectedHash.toLowerCase()))
    throw new Error('source hash mismatch');
  return Object.freeze({
    schema:'neo.pm.custody.v1',assetRef,sourceId,originChannel,importedAt,
    sourceHash,byteLength:originalBytes.length,recordContentStatus:'BYTES_CAPTURED',
    governmentIssuerSignature:'NOT_AUTHENTICATED',legalTitleStatus:'NOT_VERIFIED',
    mortgageOrLienStatus:'NOT_VERIFIED',managerAuthority:'NOT_VERIFIED',
    bitcoinPublication:'NOT_PUBLISHED',externalAction:'NONE'
  });
}
export function signInternalCustodyReview({receipt,reviewerId,reviewerKeyId,reviewedAt,privateKey}={}) {
  if (receipt?.schema!=='neo.pm.custody.v1') throw new Error('custody receipt required');
  requireText(reviewerId,'reviewerId'); requireText(reviewerKeyId,'reviewerKeyId');
  requireText(reviewedAt,'reviewedAt');
  if (Number.isNaN(Date.parse(reviewedAt))) throw new Error('invalid review time');
  const payload=Object.freeze({
    schema:'neo.pm.internal-review.v1',reviewerId,reviewerKeyId,reviewedAt,
    custodyReceiptHash:hash(Buffer.from(canonical(receipt))),
    reviewScope:'SOURCE_BYTES_AND_INTERNAL_CHAIN_OF_CUSTODY_ONLY',
    governmentSourceAuthenticated:false,propertyTitleAccepted:false,
    authorityToEnterOrManage:false
  });
  const signature=sign(null,Buffer.from(canonical(payload)),privateKey).toString('base64');
  return Object.freeze({payload,signature});
}
export function verifyInternalCustodyReview({receipt,review,trustedPublicKeys}={}) {
  if (!receipt || receipt.schema!=='neo.pm.custody.v1' || !review?.payload || !review.signature) return false;
  const payload=review.payload;
  const key=trustedPublicKeys?.[payload.reviewerKeyId];
  if (!key || payload.schema!=='neo.pm.internal-review.v1' ||
      payload.custodyReceiptHash!==hash(Buffer.from(canonical(receipt))) ||
      payload.reviewScope!=='SOURCE_BYTES_AND_INTERNAL_CHAIN_OF_CUSTODY_ONLY' ||
      payload.governmentSourceAuthenticated!==false ||
      payload.propertyTitleAccepted!==false ||
      payload.authorityToEnterOrManage!==false) return false;
  try { return verify(null,Buffer.from(canonical(payload)),key,Buffer.from(review.signature,'base64')); }
  catch { return false; }
}
export function controllerAndDebtGate({custody,reviewVerified=false,certifiedDeed=false,
  controllerVerified=false,recordedLienVerified=false,lenderAssignmentVerified=false,
  officialForeclosureNoticeVerified=false}={}) {
  if (custody?.schema!=='neo.pm.custody.v1') throw new Error('custody receipt required');
  return Object.freeze({
    assetRef:custody.assetRef,internalCustodyReviewed:Boolean(reviewVerified),
    externallyCertifiedDeedVerified:Boolean(certifiedDeed),
    corporateControllerVerified:Boolean(controllerVerified),
    genuineSecuredDebtLead:Boolean(recordedLienVerified&&lenderAssignmentVerified),
    foreclosureLead:Boolean(officialForeclosureNoticeVerified),
    propertyAcquired:false,propertyEntryAuthorized:false,managementActive:false,
    allowedNextStep:'NONBINDING_ACQUISITION_REVIEW'
  });
}
