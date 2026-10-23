// NEO-WIRE-005D: policy helper only. No route is mounted or enabled.
import {authorizeWirePasskeySession} from './wire-passkey-http-guard.mjs';
export async function authorizeWirePasskeyEndpoint({
 req,resolveMember,rateLimit,audit,origin='https://wire.holytemples.org'
}={}) {
 const authorization=await authorizeWirePasskeySession({req,resolveMember,origin});
 if(!authorization.ok) return authorization;
 if(typeof rateLimit!=='function'||typeof audit!=='function') return {ok:false,status:503,error:'security_controls_unavailable'};
 let allowed=false;
 try {allowed=await rateLimit({memberId:authorization.memberId,req})===true}
 catch {return {ok:false,status:503,error:'rate_limit_unavailable'}}
 if(!allowed) return {ok:false,status:429,error:'rate_limited'};
 try {await audit({event:'wire.passkey.request',memberId:authorization.memberId,method:req.method})}
 catch {return {ok:false,status:503,error:'audit_unavailable'}}
 return authorization;
}
