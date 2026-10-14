// NEO-WIRE-004I: staging-only orchestration; routes must enforce NEOpass
// sessions, CSRF, rate limits, and audit before this service is exposed.
export function createWirePasskeyService({challenges,credentials,verifier,rpId='wire.holytemples.org'}={}){
 if(!challenges||!credentials||!verifier) throw new Error('passkey_dependencies_required');
 const scope=(memberId,operation)=>({memberId,operation,rpId});
 return {
   beginRegistration({memberId}) {
     if(!memberId) throw new Error('authenticated_member_required');
     return challenges.issue(scope(memberId,'passkey.register'));
   },
   async finishRegistration({memberId,challenge,response}) {
     if(!memberId) throw new Error('authenticated_member_required');
     // Verify attestation before consuming the challenge; consume regardless
     // of verification outcome to avoid replay of a rejected response.
     let info;
     try {
       info=await verifier.verifyRegistration({response,expectedChallenge:challenge});
     } finally {
       const consumed=challenges.consumeVerified({challenge,...scope(memberId,'passkey.register')});
       if(!consumed) throw new Error('invalid_or_expired_challenge');
     }
     const credential=info?.credential;
     if(!credential?.id||!credential.publicKey) throw new Error('invalid_verified_credential');
     return credentials.register({credentialId:credential.id,memberId,publicKey:credential.publicKey,signCount:credential.counter??0,transports:response?.response?.transports??[],rpId});
   },
   beginAuthentication({memberId}) {
     if(!memberId) throw new Error('authenticated_member_required');
     return challenges.issue(scope(memberId,'passkey.authenticate'));
   },
   async finishAuthentication({memberId,challenge,credentialId,response}) {
     if(!memberId) throw new Error('authenticated_member_required');
     const credential=await credentials.getForVerification({credentialId,memberId,rpId});
     if(!credential) throw new Error('credential_not_authorized');
     let info;
     try {
       info=await verifier.verifyAuthentication({response,expectedChallenge:challenge,authenticator:{id:credential.credentialId,publicKey:credential.publicKey,counter:credential.signCount,transports:credential.transports}});
     } finally {
       const consumed=challenges.consumeVerified({challenge,...scope(memberId,'passkey.authenticate')});
       if(!consumed) throw new Error('invalid_or_expired_challenge');
     }
     if(!await credentials.updateCounter({credentialId,memberId,rpId,expectedCounter:credential.signCount,newCounter:info.newCounter})) throw new Error('counter_update_failed');
     return {verified:true,memberId,credentialId};
   }
 };
}
