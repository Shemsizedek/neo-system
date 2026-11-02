// Staging-only Neon Managed Better Auth JWT validator.
// Strict Ed25519 signature and JWT claims; no trust in role claims.
import {createPublicKey,verify as verifySignature} from "node:crypto";
const unauthorized=()=>Object.assign(new Error("AUTH_REQUIRED"),{code:"AUTH_REQUIRED",status:401});
export function createNeonJwtVerifier({issuer,audience,jwks,clock=Date.now}){
 if(typeof issuer!=="string"||!issuer.startsWith("https://")||!audience||!Array.isArray(jwks)||jwks.length===0)throw new Error("NEON_AUTH_CONFIG_REQUIRED");
 const keys=new Map();
 for(const jwk of jwks){
  if(jwk.kty!=="OKP"||jwk.crv!=="Ed25519"||typeof jwk.kid!=="string"||!jwk.kid||jwk.alg&&jwk.alg!=="EdDSA")throw Error("INVALID_JWKS_KEY");
  keys.set(jwk.kid,createPublicKey({key:jwk,format:"jwk"}));
 }
 function parse(s){try{return JSON.parse(Buffer.from(s,"base64url").toString("utf8"))}catch{throw unauthorized()}}
 return async function verify(token){
  if(typeof token!=="string"||token.length>8192||token.length<24)throw unauthorized();
  const parts=token.split(".");if(parts.length!==3)throw unauthorized();
  const header=parse(parts[0]),claims=parse(parts[1]);
  if(header.alg!=="EdDSA"||!keys.has(header.kid))throw unauthorized();
  if(!verifySignature(null,Buffer.from(parts[0]+"."+parts[1]),keys.get(header.kid),Buffer.from(parts[2],"base64url")))throw unauthorized();
  const now=Math.floor(clock()/1000),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==new URL(issuer).origin||!aud.includes(new URL(issuer).origin)||typeof claims.sub!=="string"||claims.sub.length<3||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+3600||(claims.nbf&&claims.nbf>now+30))throw unauthorized();
  return Object.freeze({sub:claims.sub});
 };
}
