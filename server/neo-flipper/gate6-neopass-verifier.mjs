/** NEO-FLIP-006: hardened HS256 verification for NEOpass-issued, staging-only JWTs.
 * Do not mint here. Inject an independently trusted membership and revocation adapter.
 * No secrets, fallback identities, broad wildcard privileges, or token logging.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const VALID_SCOPES = Object.freeze([
  'buyer:read','buyer:write','listing:read','listing:write','deal:read','audit:read'
]);
const base64url = /^[A-Za-z0-9_-]+$/;
const safeText = (v,max=128)=>typeof v==='string'&&v.length>0&&v.length<=max;
const safeSec = (v)=>Number.isSafeInteger(v)&&v>0;
const intersection = (a,b)=>a.filter(scope=>VALID_SCOPES.includes(scope)&&b.includes(scope));

export function createGate6NeopassVerifier({
  secret, issuer='neo-pass', audience='neo-flipper-staging',
  getCurrentAccess, isRevoked, clock=()=>Date.now(), maxTtlSeconds=300,
}={}) {
  if (!(typeof secret==='string'&&Buffer.byteLength(secret,'utf8')>=32) &&
      !(Buffer.isBuffer(secret)&&secret.length>=32)) throw new Error('staging_issuer_secret_required');
  if(typeof getCurrentAccess!=='function'||typeof isRevoked!=='function')
    throw new Error('trusted_access_and_revocation_adapters_required');
  if(!safeText(issuer,100)||!safeText(audience,100)||!safeSec(maxTtlSeconds)||maxTtlSeconds>300)
    throw new Error('issuer_policy_invalid');
  const key=Buffer.isBuffer(secret)?Buffer.from(secret):Buffer.from(secret,'utf8');
  return async function verifyToken(token) {
    if(!safeText(token,8192))return null;
    const parts=token.split('.');
    if(parts.length!==3||parts.some(p=>!base64url.test(p)))return null;
    let header,payload;
    try {
      header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
      payload=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
    }catch{return null}
    if(!header||header.alg!=='HS256'||header.typ!=='JWT'||header.kid||header.crit||header.zip)return null;
    if(!payload||payload.iss!==issuer||payload.aud!==audience||payload.active!==true||
      !safeText(payload.sub,120)||!safeText(payload.jti,128)||
      !safeSec(payload.iat)||!safeSec(payload.exp)||
      !Array.isArray(payload.scopes)||!payload.scopes.length||
      payload.scopes.length>VALID_SCOPES.length||
      !payload.scopes.every(x=>VALID_SCOPES.includes(x)))return null;
    const now=Math.floor(clock()/1000);
    if(!safeSec(now)||payload.iat>now+30||payload.iat<now-maxTtlSeconds-30||
      payload.exp<=now||payload.exp-payload.iat>maxTtlSeconds||
      payload.exp<=payload.iat||payload.exp>now+maxTtlSeconds+30||
      (payload.nbf!==undefined&&(!safeSec(payload.nbf)||payload.nbf>now+30)))return null;
    const expected=createHmac('sha256',key).update(parts[0]+'.'+parts[1]).digest();
    let actual;try{actual=Buffer.from(parts[2],'base64url')}catch{return null}
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
    // Both providers are mandatory. Any outage propagates to the existing service as 503.
    if(await isRevoked({subject:payload.sub,jti:payload.jti})!==false)return null;
    const access=await getCurrentAccess({subject:payload.sub,jti:payload.jti});
    if(!access||access.active!==true||!Array.isArray(access.scopes))return null;
    const scopes=intersection(payload.scopes,access.scopes);
    if(scopes.length===0)return null;
    return {
      signatureValidated:true, iss:issuer, aud:audience, sub:payload.sub,
      active:true, exp:payload.exp, jti:payload.jti, scopes
    };
  };
}
