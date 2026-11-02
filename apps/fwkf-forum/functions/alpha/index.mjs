// Gate 021: cloud-only, branch-scoped READ-ONLY Forum identity probe.
// No registration, write routes, credentials or live member content.
import {createPublicKey,verify as verifySignature} from "node:crypto";
const ALLOWED_ORIGIN="https://worldcafe.holytemples.org";
const noStore={"cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
let cached=null,cacheUntil=0;
const result=(status,payload,origin,more={})=>new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json; charset=utf-8",...noStore,...(origin===ALLOWED_ORIGIN?{"access-control-allow-origin":ALLOWED_ORIGIN,"vary":"Origin"}:{}),...more}});
const reject=()=>Object.assign(new Error("AUTH_REQUIRED"),{status:401});
const parse=(s)=>{try {if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error("bad");return JSON.parse(Buffer.from(s,"base64url").toString("utf8"))}catch{throw reject()}};
async function keys(){
 const url=process.env.NEON_AUTH_JWKS_URL,base=process.env.NEON_AUTH_BASE_URL;
 if(!url||!base||!url.startsWith("https://")||!base.startsWith("https://"))throw Object.assign(new Error("AUTH_UNAVAILABLE"),{status:503});
 if(cached&&Date.now()<cacheUntil)return cached;
 const res=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(5000),headers:{accept:"application/json"}});
 if(!res.ok)throw Object.assign(new Error("AUTH_UNAVAILABLE"),{status:503});
 const body=await res.json();
 if(!Array.isArray(body.keys)||body.keys.length>10)throw Object.assign(new Error("AUTH_UNAVAILABLE"),{status:503});
 const imported=new Map();
 for(const k of body.keys)if(k.kty==="OKP"&&k.crv==="Ed25519"&&typeof k.kid==="string"&&k.kid&&(!k.alg||k.alg==="EdDSA"))imported.set(k.kid,createPublicKey({key:k,format:"jwk"}));
 if(!imported.size)throw Object.assign(new Error("AUTH_UNAVAILABLE"),{status:503});
 cached=imported;cacheUntil=Date.now()+60000;return imported;
}
async function identity(token){
 if(!token||token.length>8192||token.length<30)throw reject();
 const bits=token.split(".");if(bits.length!==3||!/^[A-Za-z0-9_-]+$/.test(bits[2]))throw reject();
 const header=parse(bits[0]),claims=parse(bits[1]),map=await keys();
 if(header.alg!=="EdDSA"||!map.has(header.kid))throw reject();
 if(!verifySignature(null,Buffer.from(bits[0]+"."+bits[1]),map.get(header.kid),Buffer.from(bits[2],"base64url")))throw reject();
 const now=Math.floor(Date.now()/1000),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
 if(claims.iss!==process.env.NEON_AUTH_BASE_URL||!aud.includes("authenticated")||typeof claims.sub!=="string"||claims.sub.length<3||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+3600||(claims.nbf&&claims.nbf>now+30)||(claims.iat&&claims.iat>now+30))throw reject();
 return {valid:true};
}
export default {async fetch(req){
 const origin=req.headers.get("origin"),url=new URL(req.url);
 if(origin&&origin!==ALLOWED_ORIGIN)return result(403,{error:"ORIGIN_NOT_ALLOWED"},null);
 if(req.method==="OPTIONS")return origin===ALLOWED_ORIGIN?new Response(null,{status:204,headers:{"access-control-allow-origin":ALLOWED_ORIGIN,"access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Authorization","access-control-max-age":"300","vary":"Origin",...noStore}}):result(403,{error:"ORIGIN_NOT_ALLOWED"},null);
 if(req.method!=="GET")return result(405,{error:"POSTING_NOT_ENABLED"},origin,{"allow":"GET, OPTIONS"});
 if(url.pathname==="/health")return result(200,{service:"Free World Knowledge Forum",environment:"private-alpha",status:"read_only",registration:false,posting:false},origin);
 if(url.pathname!=="/me")return result(404,{error:"NOT_FOUND"},origin);
 const auth=req.headers.get("authorization")||"",match=auth.match(/^Bearer ([A-Za-z0-9._-]{30,8192})$/);
 if(!match)return result(401,{error:"AUTH_REQUIRED"},origin);
 try{await identity(match[1]);return result(200,{authenticated:true,posting:false,membership:"requires_invitation"},origin)}catch(e){return result(e.status===503?503:401,{error:e.status===503?"AUTH_UNAVAILABLE":"AUTH_REQUIRED"},origin)}
}};
