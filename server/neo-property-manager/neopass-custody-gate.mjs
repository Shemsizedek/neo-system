/**
 * NCC-020 — fail-closed bridge from an externally verified NEOpass session
 * to *internal custody-review* approval only. This is not a login server.
 * No production passkey assertion, signature, keys, document, asset or tenant
 * data are stored by the module. No title, possession, liens or funds authorized.
 * The supplied verifier, registry and durable nonce store must be secured
 * independently; a browser's claimed NEOpass role is never trusted.
 */
import {verifyInternalCustodyReview} from './source-attestation.mjs';

const allowedScope = 'neo.property.custody.review';
const isText = x => typeof x === 'string' && x.trim().length > 0;
const parseTime = x => typeof x === 'string' ? Date.parse(x) : Number.NaN;
const allowedTime = (t,now,maxAgeMs) => Number.isFinite(t) && t <= now + 1000 && now - t >= 0 && now - t <= maxAgeMs;

export function inspectNeopassPropertyManagerReadiness(connection={}, serviceAccess={}) {
  const items={
    connection:connection.connected === true,
    passkeyEnrolled:connection.passkeyEnrolled === true,
    passkeyStepUp:connection.passkeyVerified === true && connection.pluginPasskeyStepUp === true,
    vault:connection.credentialVault?.configured === true,
    serviceLinked:connection.legacyAccountLinked === true && serviceAccess.legacyAccountLinked === true,
    servicePermission:Array.isArray(serviceAccess.services) && serviceAccess.services.some(s =>
      s && s.id==='neo-property-manager' && s.granted===true)
  };
  return Object.freeze({
    schema:'neo.pm.neopass-readiness.v1', checks:Object.freeze(items),
    readyForCustodyApproval:Object.values(items).every(Boolean),
    propertyEntryAuthorized:false, titleAccepted:false,
    note:'Readiness only; actual step-up and authority require server-side verification'
  });
}

export function createCustodyAuthorizationGate({verifySession,lookupGrant,consumeNonce,now=()=>Date.now(),trustedReviewerKeys,maxAgeMs=5*60*1000}={}) {
  if (typeof verifySession!=='function'||typeof lookupGrant!=='function'||
      typeof consumeNonce!=='function'||typeof now!=='function'||
      !trustedReviewerKeys||typeof trustedReviewerKeys!=='object' ||
      !Number.isInteger(maxAgeMs)||maxAgeMs<=0||maxAgeMs>600000)
    throw new Error('custody_gate_verified_backends_required');

  return async function authorize({sessionToken,challengeNonce,receipt,review}={}) {
    // Never echo auth tokens or source records on error paths.
    if (!isText(sessionToken)||!isText(challengeNonce)||challengeNonce.length<24||
        receipt?.schema!=='neo.pm.custody.v1'||review?.payload?.schema!=='neo.pm.internal-review.v1')
      return Object.freeze({allowed:false,reason:'INVALID_REQUEST'});
    const nowMs=now();
    if (!Number.isFinite(nowMs)) return Object.freeze({allowed:false,reason:'INVALID_CLOCK'});

    let verified;
    try {verified=await verifySession(sessionToken);} catch {return Object.freeze({allowed:false,reason:'SESSION_NOT_VERIFIED'});}
    if (!verified || verified.verified!==true || verified.issuer!=='NEOpass' ||
        verified.passkeyStepUpVerified!==true || verified.serviceLinked!==true ||
        !isText(verified.subject) || !isText(verified.sessionId) ||
        !allowedTime(parseTime(verified.authenticatedAt),nowMs,maxAgeMs) ||
        !(parseTime(verified.expiresAt)>nowMs))
      return Object.freeze({allowed:false,reason:'SESSION_NOT_VERIFIED'});

    let grant;
    try {grant=await lookupGrant(verified.subject);} catch {return Object.freeze({allowed:false,reason:'AUTHORITY_NOT_VERIFIED'});}
    // Service role derives ONLY from the authoritative registry, never token claims.
    if (!grant || grant.subject!==verified.subject || grant.status!=='active' ||
        grant.revoked===true || grant.role!=='custody-reviewer' ||
        !Array.isArray(grant.scopes) || !grant.scopes.includes(allowedScope) ||
        !isText(grant.reviewerKeyId)||review.payload.reviewerId!==verified.subject ||
        review.payload.reviewerKeyId!==grant.reviewerKeyId ||
        !allowedTime(parseTime(review.payload.reviewedAt),nowMs,maxAgeMs))
      return Object.freeze({allowed:false,reason:'AUTHORITY_NOT_VERIFIED'});

    if (!verifyInternalCustodyReview({receipt,review,trustedPublicKeys:trustedReviewerKeys}))
      return Object.freeze({allowed:false,reason:'CUSTODY_SIGNATURE_INVALID'});
    let consumed=false;
    try {
      consumed=await consumeNonce({nonce:challengeNonce,subject:verified.subject,
        sessionId:verified.sessionId,receiptHash:review.payload.custodyReceiptHash,
        expiresAt:new Date(nowMs+maxAgeMs).toISOString()});
    } catch { return Object.freeze({allowed:false,reason:'CHALLENGE_NOT_ACCEPTED'}); }
    if (consumed !== true) return Object.freeze({allowed:false,reason:'CHALLENGE_NOT_ACCEPTED'});

    return Object.freeze({
      allowed:true,status:'CUSTODY_REVIEW_APPROVED_ONLY',
      subject:verified.subject,assetRef:receipt.assetRef,
      sourceHash:receipt.sourceHash,reviewerKeyId:grant.reviewerKeyId,
      titleAccepted:false,ownerConsentGranted:false,managementAuthority:false,
      propertyEntryAuthorized:false,externalFilingAuthorized:false,
      bitcoinPublicationAuthorized:false
    });
  };
}
