// Fail-closed JWT verifier: trusted issuer, audience, RS256 signature and expiry.
// Never trust role claims; roles come from the member database.
import {createPublicKey,verify as verifySignature} from "node:crypto";
const denied=()=>Object.assign(new Error("AUTH_REQUIRED"),{code:"AUTH_REQUIRED",status:401});
const jsonPart=str=>{try{return JSON.parse(Buffer.from(str,"base64url").toString("utf8"))}catch{throw denied()}};
export function createJwtVerifier({issuer,audience,jwks,clock=()=>Date.now()}){
 if(typeof issuer!=="string"||!issuer.startsWith("https://")||typeof audience!=="string"||!audience||!Array.isArray(jwks)||!jwks.length)throw Error("AUTH_PROVIDER_NOT_CONFIGURED");
 const keys=new Map();
 for(const jwk of jwks){
  if(jwk.kty!=="RSA"||typeof jwk.kid!=="string"||!jwk.kid||jwk.alg&&jwk.alg!=="RS256")throw Error("INVALID_TRUSTED_KEY");
  keys.set(jwk.kid,createPublicKey({key:jwk,format:"jwk"}));
 }
 return async function verifyIdentity(token){
  if(typeof token!=="string"||token.length>8192||token.length<30)throw denied();
  const p=token.split(".");if(p.length!==3)throw denied();
  const header=jsonPart(p[0]),claims=jsonPart(p[1]);
  if(header.alg!=="RS256"||header.typ&&header.typ!=="JWT"||!keys.has(header.kid))throw denied();
  if(!verifySignature("RSA-SHA256",Buffer.from(p[0]+"."+p[1]),keys.get(header.kid),Buffer.from(p[2],"base64url")))throw denied();
  const now=Math.floor(clock()/1000),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==issuer||!aud.includes(audience)||typeof claims.sub!=="string"||!claims.sub||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+3600||claims.nbf&&claims.nbf>now+30||claims.iat&&claims.iat>now+30)throw denied();
  return Object.freeze({sub:claims.sub});
 };
}
