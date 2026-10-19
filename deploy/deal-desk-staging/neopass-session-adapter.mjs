import {verifyNeopassToken} from '../../server/neo-platform-api/neopass-google-auth.mjs';
import {createNeopassOperatorBridge} from './neopass-operator-bridge.mjs';

function readSessionCookie(req) {
 const raw=req.headers?.cookie;
 if(typeof raw!=='string'||raw.length>8192) return null;
 const parts=raw.split(';').map(x=>x.trim()).filter(x=>x.startsWith('neo_pass_session='));
 if(parts.length!==1) return null;
 const value=parts[0].slice('neo_pass_session='.length);
 return /^[A-Za-z0-9._-]{20,6000}$/.test(value)?value:null;
}
export function createNeopassStagingIdentity({secret,issuer='neo-pass',registry,now=()=>Date.now()}={}){
 if(typeof secret!=='string'||secret.length<32||typeof registry?.getNEOpassCredential!=='function')throw new Error('secure_neopass_registry_required');
 return createNeopassOperatorBridge({
   verifySession:async req=>{
     const token=readSessionCookie(req);
     if(!token)return {authenticated:false};
     const claims=verifyNeopassToken(token,{secret,issuer,now});
     const ts=Math.floor(now()/1000);
     // Legacy verifier accepts missing exp. Enforce an explicit bounded session age here.
     if(!claims||!Number.isInteger(claims.exp)||claims.exp<=ts||
        !Number.isInteger(claims.iat)||claims.iat>ts||ts-claims.iat>8*3600||
        typeof claims.sub!=='string'||!claims.sub)return {authenticated:false};
     return {authenticated:true,subject:claims.sub};
   },
   authorizeOperator:async subject=>{
     const member=await registry.getNEOpassCredential(subject);
     // Explicit, independently stored Deal Desk permission only. Neither role claim
     // inside JWT nor a generic executive role implies this permission.
     return member?.status==='active' && Array.isArray(member.permissions) && member.permissions.includes('neo_sales_operator');
   }
 });
}
