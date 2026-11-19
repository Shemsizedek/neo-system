// Strict NEO Key subject resolver. Unmounted until the NEO Pass issuer and
// registry are independently certified. Never rely on executive token claims,
// browser flags, email addresses or an unavailable registry.
export function createNeoKeyNeopassAuthority({
  verifyIssuerToken, getAuthoritativeAccount,
  issuer='neo-pass', audience='neo-key', now=()=>Date.now()
}={}) {
  if(typeof verifyIssuerToken!=='function'||
     typeof getAuthoritativeAccount!=='function'||
     typeof issuer!=='string'||!issuer||
     typeof audience!=='string'||!audience) {
    throw Error('neo_key_neopass_authority_configuration_required');
  }
  return Object.freeze({
    async resolveSessionSubject(session){
      if(typeof session?.token!=='string'||session.token.length<30||
         session.token.length>8192)return null;
      try {
        // The verifier must validate signature/key provenance, not decode JWT.
        const claims=await verifyIssuerToken(session.token);
        const epoch=Math.floor(now()/1000);
        if(!claims||claims.iss!==issuer||claims.aud!==audience||
          claims.token_use!=='neo-key-session'||
          typeof claims.sub!=='string'||claims.sub.length<3||claims.sub.length>256||
          !Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||
          claims.iat>epoch+30||claims.iat<epoch-300||
          claims.exp<=epoch||claims.exp>claims.iat+300||
          claims.nbf!=null&&(!Number.isSafeInteger(claims.nbf)||claims.nbf>epoch))return null;
        // No fallback on transient error and no self-asserted privileged role.
        const record=await getAuthoritativeAccount(claims.sub);
        if(!record||record.subject!==claims.sub||
           record.status!=='active'||!['google','local'].includes(record.provider))return null;
        return claims.sub;
      }catch{return null;}
    }
  });
}
