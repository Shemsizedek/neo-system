// NIBIRU-034: Fail-closed bridge from existing NEOpass token verification to Deal Desk access.
// The identity's role is resolved from server-controlled membership records, never a browser claim.
import {verifyNeopassToken} from '../neo-platform-api/neopass-google-auth.mjs';
const ALLOWED=new Set(['executive-admin','deal-desk-reviewer','deal-desk-analyst']);
export function createDealDeskSessionResolver({secret,issuer='neo-pass',loadMembership,now}={}){
 if(!secret||typeof loadMembership!=='function')throw Error('verified_identity_configuration_required');
 return async function resolveSession(token){
  const verified=verifyNeopassToken(token,{secret,issuer,now});
  if(!verified?.sub)return null;
  const membership=await loadMembership(verified.sub);
  if(!membership||membership.neopassStatus!=='active'||!ALLOWED.has(membership.dealDeskRole))return null;
  return Object.freeze({authenticated:true,subject:verified.sub,neopassStatus:'active',role:membership.dealDeskRole});
 };
}
