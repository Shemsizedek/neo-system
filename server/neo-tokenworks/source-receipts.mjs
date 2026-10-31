import crypto from 'node:crypto';

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
const HOLD = reason => ({status:'HOLD',reason,readOnly:true,transferEnabled:false});
const hex64 = value => typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value);

/**
 * Authenticate independently configured source-signed read-only observations.
 * Signatures authenticate submitted messages, not the underlying Bitcoin chain.
 * Production must separately verify Core/Counterparty consensus state and node operators.
 */
export function verifySourceObservation({observation,registry,now=Date.now()}={}) {
  if(!observation || !registry || !observation.sourceId || !observation.payload ||
    typeof observation.signature!=='string' || !observation.signedAt ||
    !Number.isFinite(observation.validUntil) || observation.validUntil<now ||
    !Number.isFinite(observation.observedAt) || observation.observedAt>now ||
    now-observation.observedAt>300000 || observation.validUntil-observation.observedAt>600000)
    return HOLD('SOURCE_OBSERVATION_INVALID_OR_STALE');
  const source=registry[observation.sourceId];
  if(!source || source.enabled!==true || source.algorithm!=='ed25519' ||
    typeof source.publicKeyPem!=='string' || !source.operatorId) return HOLD('SOURCE_NOT_TRUSTED');
  let accepted=false;
  try {
    accepted=crypto.verify(null,Buffer.from(canonical({
      sourceId:observation.sourceId,payload:observation.payload,
      observedAt:observation.observedAt,validUntil:observation.validUntil,
      signedAt:observation.signedAt
    })),source.publicKeyPem,Buffer.from(observation.signature,'base64'));
  } catch { return HOLD('SIGNATURE_INVALID'); }
  if(!accepted) return HOLD('SIGNATURE_INVALID');
  return {status:'SIGNED_SOURCE_RECORDED',operatorId:source.operatorId,sourceId:observation.sourceId,
    payload:observation.payload,payloadDigest:sha256(canonical(observation.payload)),
    observedAt:observation.observedAt,independentChainVerification:false,
    orderExecutabilityVerified:false,readOnly:true,transferEnabled:false};
}

/** Separate independent operators are necessary; matching signatures alone are insufficient. */
export function compareCounterpartySources(results) {
  if(!Array.isArray(results)||results.length<2||
    results.some(r=>r?.status!=='SIGNED_SOURCE_RECORDED') ||
    new Set(results.map(r=>r.operatorId)).size<2) return HOLD('INDEPENDENT_SIGNED_SOURCES_REQUIRED');
  const first=results[0].payload;
  if(first?.asset!=='NOMNI'||!hex64(first.blockHash)||
    !Number.isSafeInteger(first.blockHeight)||first.blockHeight<0 ||
    typeof first.quantity!=='string'|| !/^\d+$/.test(first.quantity))
    return HOLD('CANONICAL_SNAPSHOT_INVALID');
  if(results.some(r=>r.payload?.asset!==first.asset||
    r.payload?.blockHash!==first.blockHash||r.payload?.blockHeight!==first.blockHeight||
    r.payload?.quantity!==first.quantity)) return HOLD('SIGNED_SOURCES_DISAGREE');
  return {status:'SIGNED_SOURCES_CONSISTENT',asset:'NOMNI',
    blockHash:first.blockHash,blockHeight:first.blockHeight,quantity:first.quantity,
    operatorIds:results.map(r=>r.operatorId),
    evidenceDigest:sha256(canonical({blockHash:first.blockHash,blockHeight:first.blockHeight,quantity:first.quantity})),
    bitcoinConsensusVerified:false,legalOwnershipVerified:false,readOnly:true,transferEnabled:false};
}

/** Crown Chain receipt PREVIEW: tamper-evident digest, deliberately not a signed attestation.
 * A licensed professional must separately sign/approve their own opinion off-platform.
 */
export function createUnsignedCrownReceipt({caseId,sourceResult,reviewer,previousDigest=null}={}) {
  if(!/^[A-Za-z0-9_-]{6,80}$/.test(caseId||'') ||
    sourceResult?.status!=='SIGNED_SOURCES_CONSISTENT'||
    !reviewer?.id || !['auditor','accountant','underwriter','lawyer'].includes(reviewer.role)||
    (previousDigest!==null&&!hex64(previousDigest))) return HOLD('RECEIPT_INPUT_INVALID');
  const content={caseId,chainEvidenceDigest:sourceResult.evidenceDigest,
    reviewerId:reviewer.id,reviewerRole:reviewer.role,previousDigest};
  return {status:'UNSIGNED_CROWN_RECEIPT',digest:sha256(canonical(content)),content,
    professionalSignature:null,attested:false,legalApproval:false,
    immutableStorageVerified:false,readOnly:true,transferEnabled:false};
}
