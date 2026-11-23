// Gate 022: dependency-injected, READ-ONLY Forum API; no credentials, inserts or posting.
import {createPublicKey,verify as verifySignature} from "node:crypto";
export const PUBLIC_ORIGIN="https://worldcafe.holytemples.org";
const headers={"cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer","content-security-policy":"default-src 'none'","x-frame-options":"DENY"};
const response=(status,data,origin,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...headers,...(origin===PUBLIC_ORIGIN?{"access-control-allow-origin":PUBLIC_ORIGIN,"vary":"Origin"}:{}),...extra}});
const problem=(status,code)=>Object.assign(new Error(code),{status,code});
const decoded=value=>{try{if(!/^[A-Za-z0-9_-]{2,8192}$/.test(value))throw Error("bad");return JSON.parse(Buffer.from(value,"base64url").toString("utf8"))}catch{throw problem(401,"AUTH_REQUIRED")}};
export function createForumDataHandler({pool,env,fetchJwks=fetch,clock=Date.now}){
 if(!pool||typeof pool.connect!=="function"||!env)throw Error("GATEWAY_UNCONFIGURED");
 let jwks=null,cacheExpires=0;
 async function identity(token){
  if(!env.NEON_AUTH_JWKS_URL?.startsWith("https://")||!env.NEON_AUTH_BASE_URL?.startsWith("https://"))throw problem(503,"IDENTITY_UNAVAILABLE");
  const parts=token?.split(".");
  if(!parts||parts.length!==3||token.length>8192||!/^[A-Za-z0-9_-]+$/.test(parts[2]))throw problem(401,"AUTH_REQUIRED");
  const head=decoded(parts[0]),body=decoded(parts[1]);
  if(head.alg!=="EdDSA"||typeof head.kid!=="string")throw problem(401,"AUTH_REQUIRED");
  if(!jwks||clock()>=cacheExpires){
   let payload;
   try{
    const r=await fetchJwks(env.NEON_AUTH_JWKS_URL,{redirect:"error",signal:AbortSignal.timeout(5000),headers:{accept:"application/json"}});
    if(!r.ok)throw Error("JWKS_FETCH");
    payload=await r.json();
   }catch{throw problem(503,"IDENTITY_UNAVAILABLE")}
   if(!Array.isArray(payload.keys)||payload.keys.length<1||payload.keys.length>12)throw problem(503,"IDENTITY_UNAVAILABLE");
   const updated=new Map();
   for(const key of payload.keys){
    if(key.kty==="OKP"&&key.crv==="Ed25519"&&key.kid&&(!key.alg||key.alg==="EdDSA")){
     try{updated.set(key.kid,createPublicKey({key,format:"jwk"}))}catch{}
    }
   }
   if(updated.size===0)throw problem(503,"IDENTITY_UNAVAILABLE");
   jwks=updated;cacheExpires=clock()+60000;
  }
  if(!jwks.has(head.kid))throw problem(401,"AUTH_REQUIRED");
  if(!verifySignature(null,Buffer.from(parts[0]+"."+parts[1]),jwks.get(head.kid),Buffer.from(parts[2],"base64url")))throw problem(401,"AUTH_REQUIRED");
  const now=Math.floor(clock()/1000),origin=new URL(env.NEON_AUTH_BASE_URL).origin,aud=Array.isArray(body.aud)?body.aud:[body.aud];
  if(body.iss!==origin||!aud.includes(origin)||typeof body.sub!=="string"||body.sub.length<3||body.sub.length>255||!Number.isInteger(body.exp)||body.exp<=now||body.exp>now+3600||body.nbf&&body.nbf>now+30||body.iat&&body.iat>now+30)throw problem(401,"AUTH_REQUIRED");
  return body.sub;
 }
 async function db(sql,params=[]){
  if(!env.DATABASE_URL||!/^SELECT /i.test(sql))throw problem(503,"DATA_UNAVAILABLE");
  let client;
  try{
   client=await pool.connect();
   await client.query("BEGIN READ ONLY");
   await client.query("SET LOCAL ROLE fwkf_forum_reader");
   const result=await client.query({text:sql,values:params,query_timeout:5000});
   await client.query("COMMIT");
   return result;
  }catch{
   if(client){try{await client.query("ROLLBACK")}catch{}}
   throw problem(503,"DATA_UNAVAILABLE");
  }finally{if(client)client.release()}
 }
 return Object.freeze({async fetch(request){
  const origin=request.headers.get("origin"),url=new URL(request.url);
  if(origin&&origin!==PUBLIC_ORIGIN)return response(403,{error:"ORIGIN_DENIED"},null);
  if(request.method==="OPTIONS")return origin===PUBLIC_ORIGIN?new Response(null,{status:204,headers:{"access-control-allow-origin":PUBLIC_ORIGIN,"access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"Authorization","vary":"Origin",...headers}}):response(403,{error:"ORIGIN_DENIED"},null);
  if(request.method!=="GET")return response(405,{error:"POSTING_CLOSED"},origin,{"allow":"GET, OPTIONS"});
  if(url.pathname==="/health")return response(200,{service:"Free World Knowledge Forum",status:"private_alpha",posting:false,registration:false,source:"staging_database"},origin);
  if(url.pathname!=="/communities"&&url.pathname!=="/me")return response(404,{error:"NOT_FOUND"},origin);
  try {
   if(url.pathname==="/communities"){
    const records=await db("SELECT slug,name,description FROM fwkf_forum.communities WHERE status='active' AND visibility='public' ORDER BY name LIMIT 25");
    return response(200,{communities:records.rows,posting:false},origin);
   }
   const token=request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9._-]{30,8192})$/)?.[1];
   if(!token)throw problem(401,"AUTH_REQUIRED");
   const sub=await identity(token);
   const member=await db("SELECT role,status FROM fwkf_forum.members WHERE auth_subject=$1 LIMIT 1",[sub]);
   if(member.rows.length!==1||member.rows[0].status!=="active")throw problem(403,"MEMBERSHIP_NOT_APPROVED");
   return response(200,{authenticated:true,membership:"approved",role:member.rows[0].role,posting:false},origin);
  }catch(e){return response([401,403,503].includes(e.status)?e.status:503,{error:e.code||"DATA_UNAVAILABLE"},origin)}
 }});
}