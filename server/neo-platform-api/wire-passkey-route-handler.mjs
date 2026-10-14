// NEO-WIRE-005F: handler factory only; not mounted to platform server.
// Production remains disabled until full WebAuthn and persistence certification.
import {authorizeWirePasskeyEndpoint} from './wire-passkey-endpoint-policy.mjs';
export function createWirePasskeyRouteHandler({
 enabled=false,service,resolveMember,rateLimit,audit
}={}) {
 return async function handleWirePasskeyRoute({req,action,payload}={}) {
  if(!enabled) return {status:404,body:{error:'not_found'}};
  if(!service) return {status:503,body:{error:'passkey_service_unavailable'}};
  const auth=await authorizeWirePasskeyEndpoint({req,resolveMember,rateLimit,audit});
  if(!auth.ok) return {status:auth.status,body:{error:auth.error}};
  const method={
   'registration.begin':'beginRegistration',
   'registration.finish':'finishRegistration',
   'authentication.begin':'beginAuthentication',
   'authentication.finish':'finishAuthentication'
  }[action];
  if(!method||typeof service[method]!=='function') return {status:404,body:{error:'unknown_action'}};
  try {
   const result=await service[method]({...payload,memberId:auth.memberId});
   return {status:200,body:result};
  } catch {
   return {status:400,body:{error:'passkey_request_rejected'}};
  }
 };
}
