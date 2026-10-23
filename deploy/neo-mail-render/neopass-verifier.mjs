import {createRemoteJWKSet,jwtVerify} from 'jose';

/** Issuer-controlled keys; fail closed when authoritative configuration is absent. */
export function createNeoPassVerifier({issuer,audience,jwksUrl,allowedAlgorithms=['RS256','ES256']}={}) {
  if(!issuer || !audience || !jwksUrl) throw new Error('neopass_not_configured');
  const iss=new URL(issuer),keys=new URL(jwksUrl);
  if(iss.protocol!=='https:'||keys.protocol!=='https:'||iss.origin!==keys.origin || iss.username || keys.username || iss.password || keys.password) throw new Error('invalid_issuer_configuration');
  if(!allowedAlgorithms.length || allowedAlgorithms.some(x=>!['RS256','ES256'].includes(x))) throw new Error('unsupported_algorithm');
  const jwks=createRemoteJWKSet(keys,{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:600000});
  return async function verifyIdentity(input){
    const token=typeof input==='string'?input:input?.token;
    if(typeof token!=='string' || token.length>8192 || token.split('.').length!==3) return null;
    try{
      const {payload}=await jwtVerify(token,jwks,{issuer,audience,algorithms:allowedAlgorithms,clockTolerance:5,requiredClaims:['sub','exp','iat']});
      if(typeof payload.sub!=='string'|| !payload.sub || typeof payload.mailbox!=='string' || !payload.mailbox) return null;
      return {verified:true,subject:payload.sub,mailbox:payload.mailbox};
    }catch{return null;}
  };
}
