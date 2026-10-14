// NEO-WIRE-005J: staging composition only; does not mount routes.
import {createWireNeopassSessionResolver} from './wire-neopass-session-resolver.mjs';
import {createWirePasskeyRouteHandler} from './wire-passkey-route-handler.mjs';
import {assertWirePasskeyReadiness} from './wire-passkey-feature-gate.mjs';
export function createWirePasskeyStagingHandler({
 enabled=false,environment='staging',certified=false,
 subjectResolver,authService,service,verifier,challengeStore,
 credentialRegistry,rateLimit,audit
}={}) {
 if(!enabled) return createWirePasskeyRouteHandler({enabled:false});
 const resolveMember=createWireNeopassSessionResolver({subjectResolver,authService});
 assertWirePasskeyReadiness({
  enabled:true,environment,certified,verifier,challengeStore,
  credentialRegistry,sessionResolver:resolveMember,rateLimiter:rateLimit,audit
 });
 return createWirePasskeyRouteHandler({
  enabled:true,service,resolveMember,rateLimit,audit
 });
}
