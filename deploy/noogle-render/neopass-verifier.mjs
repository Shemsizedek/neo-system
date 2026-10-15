import { createPublicKey, verify as verifySignature } from 'node:crypto';

// Inactive NEO Pass verifier contract. Trust configuration must be provisioned
// from a verified NEO Pass issuer, never from untrusted browser input.
// Only ES256 JWTs are accepted; this module grants no permissions or sessions.
const decode=b=>JSON.parse(Buffer.from(b,'base64url').toString('utf8'));
export function createNeoPassVerifier({issuer,audience,keys,now=()=>Date.now(),isRevoked}) {
 if(!issuer || !audience || !keys || typeof isRevoked!=='function')throw Error('verifier_configuration_required');
 return async function verify(token) {
  try {
   if(typeof token!=='string' || token.length>8192)return null;
   const parts=token.split('.');if(parts.length!==3)return null;
   const header=decode(parts[0]),claims=decode(parts[1]);
   if(header.alg!=='ES256'||header.typ!=='JWT'||typeof header.kid!=='string')return null;
   const jwk=keys[header.kid];
   if(!jwk || jwk.kty!=='EC' || jwk.crv!=='P-256' || jwk.alg!=='ES256')return null;
   const key=createPublicKey({key:jwk,format:'jwk'});
   if(!verifySignature('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')))return null;
   const time=Math.floor(now()/1000);
   if(claims.iss!==issuer || claims.aud!==audience || typeof claims.sub!=='string' || !claims.sub || 
     !Number.isInteger(claims.iat)||!Number.isInteger(claims.exp)||!Number.isInteger(claims.nbf) ||
     claims.iat>time+30 || claims.nbf>time || claims.exp<=time || claims.exp-claims.iat>300 ||
     typeof claims.jti!=='string' || !claims.jti)return null;
   if(await isRevoked(claims.jti,claims.sub))return null;
   // Authentication of a JWT alone does not establish device-bound key proof.
   return {subject:claims.sub,sessionId:claims.jti,assurance:'session-only'};
  }catch{return null;}
 };
}
