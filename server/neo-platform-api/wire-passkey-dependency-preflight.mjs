// NEO-WIRE-005O: staging-only WebAuthn dependency preflight.
// Do not activate enrollment until an audited version and lockfile are installed.
export async function preflightWireWebAuthn({
 load=()=>import('@simplewebauthn/server'),
 requiredVersion=null
}={}) {
 if(typeof load!=='function') throw new Error('webauthn_loader_required');
 if(typeof requiredVersion!=='string'||!/^\d+\.\d+\.\d+$/.test(requiredVersion)) {
  throw new Error('webauthn_pinned_version_required');
 }
 let provider;
 try {provider=await load()} catch {throw new Error('webauthn_dependency_unavailable')}
 if(typeof provider?.verifyRegistrationResponse!=='function'||
    typeof provider?.verifyAuthenticationResponse!=='function') {
  throw new Error('webauthn_verification_exports_missing');
 }
 // Caller must verify the installed version against the audited package lock.
 return {ready:true,requiredVersion,provider};
}
