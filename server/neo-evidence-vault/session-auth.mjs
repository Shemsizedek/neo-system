import {verifyNeopassToken,SESSION_COOKIE} from '../neo-platform-api/neopass-google-auth.mjs';

// Opt-in adapter: operator grants and live registry state, never token role claims.
export function createEvidenceSessionAuthenticator({registry,jwtSecret,jwtIssuer='neo-pass',grants=[],allowedOrigins=[],now=()=>Date.now()}={}){
 if(typeof registry?.getNEOpassCredential!=='function'||typeof jwtSecret!=='string'||jwtSecret.length<32||!Array.isArray(grants)||!Array.isArray(allowedOrigins))throw new Error('evidence_session_configuration_required');
 const origins=new Set(allowedOrigins);
 for(const origin of origins){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin)throw new Error('invalid_evidence_origin');}
 const approvals=new Map();
 for(const grant of grants){
  if(typeof grant?.subject!=='string'||!grant.subject||approvals.has(grant.subject)||!Array.isArray(grant.roles)||!grant.roles.length||grant.roles.some(role=>!['read','ingest','review'].includes(role)))throw new Error('invalid_evidence_grant');
  approvals.set(grant.subject,[...grant.roles]);
 }
 return async function authenticate(req){
  const origin=String(req.headers.origin||'');
  if(origin&&!origins.has(origin))return null;
  const authorization=String(req.headers.authorization||'');
  let token=/^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization)?.[1];
  if(!token){
   // Cookie sessions are strictly read-only and same-origin. No cookie-only writes.
   const site=req.headers['sec-fetch-site'];
   const cookieOrigin=origin||(site==='same-origin'?`https://${req.headers.host||''}`:'');
   if(authorization||req.method!=='GET'||!origins.has(cookieOrigin)||site!=='same-origin')return null;
   const matches=String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(SESSION_COOKIE+'='));
   if(matches.length!==1)return null;
   token=matches[0].slice(SESSION_COOKIE.length+1);
  }
  const claims=verifyNeopassToken(token,{secret:jwtSecret,issuer:jwtIssuer,now});
  const millis=now(), epoch=Math.floor((typeof millis==='number'?millis:Date.parse(millis))/1000);
  if(!Number.isFinite(epoch)||!claims||typeof claims.sub!=='string'||!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||claims.iat>epoch+30||claims.exp<=epoch||claims.exp<=claims.iat||claims.exp-claims.iat>8*3600+30||(claims.token_use!=null&&claims.token_use!=='neopass-session')||claims.scope!=null||claims.aud!=null)return null;
  const roles=approvals.get(claims.sub);
  if(!roles)return null;
  const record=await registry.getNEOpassCredential(claims.sub);
  if(!record||record.subject!==claims.sub||record.status!=='active')return null;
  // Registry claims establish membership; explicit service grants establish rights.
  return {actor:record.subject,roles:authorization?[...roles]:roles.filter(role=>role==='read')};
 };
}
