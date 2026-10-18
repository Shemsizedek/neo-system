import {createPublicKey,verify as verifySignature} from 'node:crypto';
const decode=(s)=>{if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid_token_encoding');return Buffer.from(s,'base64url')};
const parse=s=>JSON.parse(decode(s).toString('utf8'));
export function createOidcVerifier({issuer,audience,jwksUri,fetchImpl=fetch,now=()=>Date.now()}={}){
 if(!issuer||!audience||!jwksUri)throw Error('oidc_configuration_required');
 const u=new URL(jwksUri);const iss=new URL(issuer);
 if(u.protocol!=='https:'||iss.protocol!=='https:'||u.username||u.password||u.hash)throw Error('https_oidc_required');
 if(u.origin!==iss.origin)throw Error('jwks_origin_mismatch');
 let cache=null,expires=0;
 async function keys(){
  if(cache&&now()<expires)return cache;
  const response=await fetchImpl(jwksUri,{headers:{accept:'application/json'},signal:AbortSignal.timeout(5000),redirect:'error'});
  if(!response.ok)throw Error('jwks_unavailable');
  const data=await response.json();
  if(!Array.isArray(data.keys)||data.keys.length>32)throw Error('invalid_jwks');
  cache=data.keys.filter(k=>k.kty==='RSA'&&k.use!=='enc'&&(!k.alg||k.alg==='RS256'));expires=now()+60000;
  return cache;
 }
 return async function verifyIdentity(req){
  const header=req.headers?.authorization;
  if(typeof header!=='string'||!header.startsWith('Bearer '))throw Error('missing_bearer');
  const token=header.slice(7),parts=token.split('.');
  if(parts.length!==3||parts.some(p=>p.length>10000))throw Error('invalid_jwt');
  const h=parse(parts[0]),claims=parse(parts[1]);
  if(h.alg!=='RS256'||typeof h.kid!=='string'||!h.kid)throw Error('unsupported_jwt');
  const candidates=await keys();const key=candidates.find(x=>x.kid===h.kid);
  if(!key)throw Error('unknown_key');
  const valid=verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),decode(parts[2]));
  const t=Math.floor(now()/1000);
  if(!valid||claims.iss!==issuer||!(claims.aud===audience||Array.isArray(claims.aud)&&claims.aud.includes(audience))||!Number.isInteger(claims.exp)||claims.exp<=t||!Number.isInteger(claims.iat)||claims.iat>t+60||claims.nbf!=null&&claims.nbf>t)throw Error('jwt_verification_failed');
  return {verified:true,subject:claims.sub,roles:Array.isArray(claims.roles)?claims.roles.filter(x=>typeof x==='string'):[]};
 };
}
