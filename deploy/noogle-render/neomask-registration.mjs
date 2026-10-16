import { randomBytes } from 'node:crypto';

// Trusted NEO Mask WebAuthn registration boundary. Not exposed as HTTP route.
// verifyAttestation MUST cryptographically verify authenticatorData, attestation,
// exact challenge, rpId and origin. This module does not parse attestation itself.
export function createNeoMaskRegistration({verifyNeoPass,issueChallenge,consumeChallenge,verifyAttestation,saveCredential,rpId='connect.holytemples.org',origin='https://connect.holytemples.org'}) {
 if([verifyNeoPass,issueChallenge,consumeChallenge,verifyAttestation,saveCredential].some(fn=>typeof fn!=='function')||
    rpId!=='connect.holytemples.org'||origin!=='https://connect.holytemples.org')
    throw Error('trusted_neomask_configuration_required');
 const session=async token=>{const user=await verifyNeoPass(token);if(!user?.subject||user.assurance!=='session-only')throw Error('neopass_required');return user.subject;};
 return Object.freeze({
  async begin(token,{displayName='NEO Member'}={}) {
   const subject=await session(token);
   const challenge=await issueChallenge({subject,rpId,origin,purpose:'register',credentialId:null});
   if(!challenge?.challenge||!challenge?.expiresAt)throw Error('challenge_unavailable');
   const userId=randomBytes(32).toString('base64url');
   return {publicKey:{challenge:challenge.challenge,rp:{id:rpId,name:'NEO Mask'},user:{id:userId,name:'NEO Member',displayName:String(displayName).slice(0,80)},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{userVerification:'required',residentKey:'preferred'},
    attestation:'none',timeout:120000},expiresAt:challenge.expiresAt};
  },
  async finish(token,{attestation,challenge}) {
   const subject=await session(token);
   const verified=await verifyAttestation({attestation,challenge,subject,rpId,origin,requireUserVerification:true});
   if(!verified?.verified||!verified.userVerified||typeof verified.credentialId!=='string'||!verified.credentialId||
      typeof verified.publicKey!=='string'||!verified.publicKey)throw Error('invalid_passkey_attestation');
   const consumed=await consumeChallenge({challenge,subject,rpId,origin,purpose:'register',credentialId:null});
   if(!consumed)throw Error('expired_or_replayed_passkey_challenge');
   await saveCredential({subject,credentialId:verified.credentialId,publicKey:verified.publicKey,rpId,origin,signCount:verified.signCount??0});
   return {registered:true,authenticator:'NEO Mask WebAuthn',deviceControlEnabled:false};
  }
 });
}
