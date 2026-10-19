import {createNeoPassVerifier} from './neopass-verifier.mjs';
import {validateMailGrant} from './mail-auth-contract.mjs';

/** Verifies cryptographic identity, then independently validates mail authorization. */
export function createScopedMailVerifier({issuer,audience='neo-mail',jwksUrl,now=()=>Math.floor(Date.now()/1000),isRevoked}={}){
 if(typeof isRevoked!=='function')throw new Error('revocation_check_required');
 const verifyToken=createNeoPassVerifier({issuer,audience,jwksUrl});
 return async function verify(input){
  const token=typeof input==='string'?input:input?.token;
  const identity=await verifyToken(token);
  if(!identity)return null;
  // Authorization claims are verified by the same signed-token verifier; reverify
  // with jose to get full validated payload. Never decode unsigned claims.
  const {jwtVerify,createRemoteJWKSet}=await import('jose');
  const {payload}=await jwtVerify(token,createRemoteJWKSet(new URL(jwksUrl)),{issuer,audience,algorithms:['RS256','ES256'],requiredClaims:['sub','exp','iat']}).catch(()=>({payload:null}));
  if(!validateMailGrant(payload,{subject:identity.subject,mailbox:identity.mailbox,audience,now:now()}))return null;
  try { if(await isRevoked(payload.jti,payload.sub))return null; }catch{return null;}
  return identity;
 };
}
