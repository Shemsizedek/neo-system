// NEO-WIRE-005B: explicit activation gate. No production route is mounted here.
// Environment toggles alone must never bypass certified dependencies.
export function assertWirePasskeyReadiness({
 enabled=false,environment='production',verifier,challengeStore,credentialRegistry,
 sessionResolver,rateLimiter,audit,certified=false
}={}) {
 if(enabled!==true) return {enabled:false,reason:'feature_disabled'};
 if(environment==='production'&&certified!==true) throw new Error('wire_passkey_production_not_certified');
 for(const [name,value] of Object.entries({verifier,challengeStore,credentialRegistry,sessionResolver,rateLimiter,audit})) {
  if(!value) throw new Error('wire_passkey_dependency_missing:'+name);
 }
 if(typeof sessionResolver!=='function'||typeof rateLimiter!=='function'||typeof audit!=='function') throw new Error('wire_passkey_security_hook_invalid');
 if(typeof verifier.verifyRegistration!=='function'||typeof verifier.verifyAuthentication!=='function') throw new Error('wire_passkey_verifier_invalid');
 if(typeof challengeStore.issue!=='function'||typeof challengeStore.consumeVerified!=='function') throw new Error('wire_passkey_challenge_store_invalid');
 if(typeof credentialRegistry.register!=='function'||typeof credentialRegistry.getForVerification!=='function'||typeof credentialRegistry.updateCounter!=='function') throw new Error('wire_passkey_registry_invalid');
 return {enabled:true,environment};
}
