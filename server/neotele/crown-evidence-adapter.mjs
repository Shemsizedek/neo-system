import {createHash,timingSafeEqual} from 'node:crypto';
// NTEL-013: an evidence-vault cross-reference, NOT a Bitcoin/Crown Chain attestation.
// Existing vault stores source metadata, not a cryptographic content digest.
// Fetch document bytes from a trusted access-controlled source before comparison.
export function createNeoTeleCrownEvidenceAdapter({getVaultEvidence,loadDocumentBytes}={}){
 if(typeof getVaultEvidence!=='function'||typeof loadDocumentBytes!=='function') throw Error('trusted_evidence_adapters_required');
 return async function verify({vaultEvidenceId,expectedDigest}={}){
  if(typeof vaultEvidenceId!=='string'||!vaultEvidenceId||
    typeof expectedDigest!=='string'||!/^sha256:[0-9a-f]{64}$/.test(expectedDigest)) throw Error('invalid_evidence_reference');
  const record=await getVaultEvidence(vaultEvidenceId);
  if(!record||record.asset!=='NEOTELE'||record.reviewStatus!=='ACCEPTED') throw Error('vault_evidence_not_accepted');
  const bytes=await loadDocumentBytes({vaultEvidenceId,record});
  if(!Buffer.isBuffer(bytes)) throw Error('trusted_evidence_bytes_required');
  const actual=createHash('sha256').update(bytes).digest();
  const expected=Buffer.from(expectedDigest.slice(7),'hex');
  if(!timingSafeEqual(actual,expected)) throw Error('evidence_digest_mismatch');
  return Object.freeze({reference:vaultEvidenceId,digest:expectedDigest,vaultReviewAccepted:true,contentDigestVerified:true,
    crownChainAnchored:false,activationAuthorized:false});
 };
}
