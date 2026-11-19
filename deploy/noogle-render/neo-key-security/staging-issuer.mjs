import {randomBytes,sign,verify} from 'node:crypto';

// Offline staging signer. The caller supplies Ed25519 keys and a trusted,
// independently verified identity decision. This module opens no listener.
const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(v);
const canonical=v=>typeof v==='string'&&/^[A-Za-z0-9_-]+$/.test(v)&&Buffer.from(v,'base64url').toString('base64url')===v;
export function createNeoKeyStagingIssuer({
  privateKey, publicKey, kid='neo-key-staging-v1',
  authorizeSession, registerSession, isSessionActive, now=()=>Date.now(), ttlSeconds=120
}={}) {
  if(privateKey?.asymmetricKeyType!=='ed25519'||
     publicKey?.asymmetricKeyType!=='ed25519'||
     typeof authorizeSession!=='function'||typeof registerSession!=='function'||
     typeof isSessionActive!=='function'||
     !validId(kid)||!Number.isSafeInteger(ttlSeconds)||
     ttlSeconds<30||ttlSeconds>300)throw Error('neo_key_staging_issuer_configuration_required');
  return Object.freeze({
    async issue({subject,evidence}={}) {
      if(typeof subject!=='string'||subject.length<3||subject.length>256)throw Error('neo_key_issuer_subject_invalid');
      const approved=await authorizeSession({subject,evidence});
      if(approved?.approved!==true||approved.subject!==subject||approved.method!=='verified-identity') {
        throw Error('neo_key_issuer_identity_approval_required');
      }
      const iat=Math.floor(now()/1000);
      const claims={iss:'neo-pass',aud:'neo-key',token_use:'neo-key-session',
        sub:subject,iat,exp:iat+ttlSeconds,jti:randomBytes(24).toString('base64url')};
      // Persist a one-use unique session identifier before signing.
      // No service availability or DB persistence => no token issuance.
      if(await registerSession({subject,jti:claims.jti,iat,exp:claims.exp})!==true) {
        throw Error('neo_key_issuer_session_persistence_required');
      }
      const payload=`${b64({alg:'EdDSA',typ:'JWT',kid})}.${b64(claims)}`;
      const signature=sign(null,Buffer.from(payload),privateKey).toString('base64url');
      return `${payload}.${signature}`;
    },
    async verify(token) {
      if(typeof token!=='string'||token.length>8192)return null;
      try {
        const segments=token.split('.');
        if(segments.length!==3||!segments.every(canonical))return null;
        const header=JSON.parse(Buffer.from(segments[0],'base64url').toString('utf8'));
        if(header.alg!=='EdDSA'||header.typ!=='JWT'||header.kid!==kid||
           Object.keys(header).length!==3)return null;
        if(!verify(null,Buffer.from(`${segments[0]}.${segments[1]}`),
           publicKey,Buffer.from(segments[2],'base64url')))return null;
        const c=JSON.parse(Buffer.from(segments[1],'base64url').toString('utf8'));
        const epoch=Math.floor(now()/1000);
        if(c.iss!=='neo-pass'||c.aud!=='neo-key'||c.token_use!=='neo-key-session'||
          typeof c.sub!=='string'||c.sub.length<3||c.sub.length>256||
          !validId(c.jti)||!Number.isSafeInteger(c.iat)||!Number.isSafeInteger(c.exp)||
          c.iat>epoch+30||c.iat<epoch-300||c.exp<=epoch||c.exp>c.iat+300)return null;
        if(await isSessionActive({subject:c.sub,jti:c.jti,now:epoch})!==true)return null;
        return c;
      }catch{return null;}
    }
  });
}
