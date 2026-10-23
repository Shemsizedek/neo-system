// NEO-WIRE-004G: Verification boundary; deliberately disabled until a vetted
// WebAuthn implementation is injected and end-to-end attestation is tested.
// Never treat challenge possession alone as authentication.
export function createWirePasskeyVerifier({verifyRegistrationResponse,verifyAuthenticationResponse,rpId,origin}={}) {
  if(typeof verifyRegistrationResponse!=='function'||typeof verifyAuthenticationResponse!=='function') throw new Error('webauthn_verifier_required');
  if(typeof rpId!=='string'||!rpId||typeof origin!=='string'||!origin.startsWith('https://')) throw new Error('valid_rp_and_origin_required');
  return {
    async verifyRegistration({response,expectedChallenge,requireUserVerification=true}) {
      if(!response||!expectedChallenge) throw new Error('registration_request_invalid');
      const result=await verifyRegistrationResponse({response,expectedChallenge,expectedOrigin:origin,expectedRPID:rpId,requireUserVerification});
      if(result?.verified!==true||!result.registrationInfo) throw new Error('registration_verification_failed');
      return result.registrationInfo;
    },
    async verifyAuthentication({response,expectedChallenge,authenticator,requireUserVerification=true}) {
      if(!response||!expectedChallenge||!authenticator) throw new Error('authentication_request_invalid');
      const result=await verifyAuthenticationResponse({response,expectedChallenge,expectedOrigin:origin,expectedRPID:rpId,credential:authenticator,authenticator,requireUserVerification});
      if(result?.verified!==true||!result.authenticationInfo) throw new Error('authentication_verification_failed');
      return result.authenticationInfo;
    }
  };
}
