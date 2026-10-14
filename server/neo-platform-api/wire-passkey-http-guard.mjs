// NEO-WIRE-004K: HTTP security guard. Not mounted to production routes.
// The caller MUST provide a server-verified NEOpass member, never a client ID.
export function authorizeWirePasskeyRequest({req,member,origin='https://wire.holytemples.org',allowedMethods=['POST']}={}) {
 if(!req||!member?.id) return {ok:false,status:401,error:'neopass_session_required'};
 if(!allowedMethods.includes(req.method)) return {ok:false,status:405,error:'method_not_allowed'};
 const headerOrigin=req.headers?.origin;
 if(headerOrigin!==origin) return {ok:false,status:403,error:'origin_not_allowed'};
 const fetchSite=req.headers?.['sec-fetch-site'];
 if(fetchSite && fetchSite!=='same-origin') return {ok:false,status:403,error:'cross_site_request_denied'};
 const contentType=String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase();
 if(contentType!=='application/json') return {ok:false,status:415,error:'json_required'};
 return {ok:true,memberId:member.id};
}

// Resolve identity on the server before applying the request guard.
export async function authorizeWirePasskeySession({req,resolveMember,origin}={}) {
 if(typeof resolveMember!=='function') return {ok:false,status:503,error:'neopass_resolver_unavailable'};
 let member;
 try { member=await resolveMember(req); } catch { return {ok:false,status:401,error:'neopass_session_invalid'}; }
 return authorizeWirePasskeyRequest({req,member,origin});
}
