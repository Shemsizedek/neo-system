// NEO-WIRE-004X: Optional SimpleWebAuthn provider for staging.
// Does not enable routes or enrollment. The deployment must explicitly install
// and pin @simplewebauthn/server, then complete real authenticator integration tests.
import {createWirePasskeyVerifier} from './wire-passkey-verifier.mjs';
export async function createSimpleWebAuthnWireVerifier({
 rpId='wire.holytemples.org',
 origin='https://wire.holytemples.org',
 load=()=>import('@simplewebauthn/server')
}={}) {
 if(typeof load!=='function') throw new Error('webauthn_provider_loader_required');
 let provider;
 try {provider=await load()} catch {throw new Error('webauthn_provider_unavailable')}
 if(typeof provider?.verifyRegistrationResponse!=='function'||typeof provider?.verifyAuthenticationResponse!=='function') {
  throw new Error('webauthn_provider_invalid');
 }
 return createWirePasskeyVerifier({
  rpId,origin,
  verifyRegistrationResponse:provider.verifyRegistrationResponse,
  verifyAuthenticationResponse:provider.verifyAuthenticationResponse
 });
}
