// NEOB-006: Preserve original CES identifiers; never infer verification from a string.
export const NMNI_PATTERN=/^NMNI[0-9]{4,}$/;
export function validateNmniIdentity(value){
 if(typeof value!=='string'||!NMNI_PATTERN.test(value))throw new Error('invalid_nmni_identity');
 return value;
}
export function publicIdentityBinding(binding){
 return {nmniAccountId:binding.nmniAccountId,alias:'NEO:'+binding.nmniAccountId,
  verificationStatus:binding.verificationStatus,verifiedAt:binding.verifiedAt||null,
  evidenceType:binding.evidenceType||null,externalCesBalanceVerified:false};
}
export function validateVerifiedBinding(input){
 validateNmniIdentity(input?.nmniAccountId);
 if(input?.verificationStatus!=='VERIFIED')throw new Error('nmni_verification_required');
 if(!['CES_OFFICIAL_EXPORT','CES_APPROVED_API','CES_SIGNED_ATTESTATION'].includes(input?.evidenceType))throw new Error('invalid_nmni_evidence');
 if(typeof input.evidenceDigest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(input.evidenceDigest))throw new Error('invalid_nmni_evidence');
 return {nmniAccountId:input.nmniAccountId,verificationStatus:'VERIFIED',evidenceType:input.evidenceType,evidenceDigest:input.evidenceDigest};
}
