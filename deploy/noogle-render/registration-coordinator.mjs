// Inactive Noogle Connect registration orchestration contract.
// Dependencies are trusted server components, never browser-controlled flags.
export function createRegistrationCoordinator({verifySession,verifyRegistration,challengeService,deviceRegistry}) {
 if([verifySession,verifyRegistration].some(fn=>typeof fn!=='function') ||
   !challengeService?.issue || !challengeService?.consume || !deviceRegistry?.enroll)
   throw Error('trusted_registration_dependencies_required');
 return Object.freeze({
  async begin(token,{rpId,origin}) {
   const session=await verifySession(token);
   if(!session?.subject || session.assurance!=='session-only')throw Error('session_required');
   // RP ID and origin MUST be selected by server configuration, not HTTP JSON.
   const challenge=await challengeService.issue({
     subject:session.subject,credentialId:null,purpose:'register',rpId,origin
   });
   return {challenge:challenge.challenge,expiresAt:challenge.expiresAt,rpId,origin};
  },
  async finish(token,{challenge,attestation,type,label,rpId,origin}) {
   const session=await verifySession(token);
   if(!session?.subject || session.assurance!=='session-only')throw Error('session_required');
   const proof=await verifyRegistration({attestation,challenge,rpId,origin,subject:session.subject});
   if(!proof?.publicKey || !proof?.credentialId || !proof.userVerified)throw Error('registration_proof_invalid');
   const consumed=await challengeService.consume({
     challenge,subject:session.subject,credentialId:null,purpose:'register',rpId,origin
   });
   if(!consumed)throw Error('challenge_invalid_or_replayed');
   // Only the trusted verifier can set proofVerified; it is never supplied by a client.
   return deviceRegistry.enroll(
     {subject:session.subject,assurance:'device-bound',credentialId:proof.credentialId},
     {type,label,publicKey:proof.publicKey,proofVerified:true}
   );
  }
 });
}
