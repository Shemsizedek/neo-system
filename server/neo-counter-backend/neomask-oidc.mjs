import {createPublicKey,verify} from 'node:crypto';
// Server-only OIDC access-token verifier. Does not make browser claims authoritative.
const decode=(part)=>{if(!/^[A-Za-z0-9_-]+$/.test(part))throw Error('malformed_token');return JSON.parse(Buffer.from(part,'base64url').toString('utf8'));};
export function verifyNeoPassJwt(token,{issuer,audience,jwks,now=Math.floor(Date.now()/1000)}){
 if(typeof token!=='string'||token.length>12000)throw Error('invalid_token');
 const parts=token.split('.');if(parts.length!==3)throw Error('invalid_token');
 const [header,payload]=parts.map(decode);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid)throw Error('unsupported_signature');
 const candidates=jwks?.keys?.filter(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use!=='enc'&&(!k.alg||k.alg==='RS256'))||[];
 if(candidates.length!==1)throw Error('untrusted_signing_key');
 const key=createPublicKey({key:candidates[0],format:'jwk'});
 if(!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,Buffer.from(parts[2],'base64url')))throw Error('bad_signature');
 const aud=Array.isArray(payload.aud)?payload.aud:[payload.aud];
 if(payload.iss!==issuer||!aud.includes(audience))throw Error('invalid_issuer_or_audience');
 if(!Number.isInteger(payload.exp)||payload.exp<=now||!Number.isInteger(payload.iat)||payload.iat>now+60)throw Error('expired_or_invalid_time');
 if(payload.nbf!==undefined&&payload.nbf>now)throw Error('token_not_yet_valid');
 if(typeof payload.sub!=='string'||!payload.sub||typeof payload.sid!=='string'||!payload.sid)throw Error('missing_subject_or_session');
 const scopes=String(payload.scope||'').split(/\s+/).filter(Boolean);
 if(!scopes.includes('wallet:read'))throw Error('wallet_read_scope_required');
 return Object.freeze({source:'neo-pass-server',subject:payload.sub,sessionId:payload.sid,scopes,revoked:false,issuer:payload.iss,expiresAt:payload.exp});
}
export async function verifyNeoPassWithRevocation(token,config){
 const principal=verifyNeoPassJwt(token,config);
 if(typeof config.isRevoked!=='function')throw Error('revocation_reader_required');
 if(await config.isRevoked(principal))throw Error('session_revoked');
 return principal;
}
