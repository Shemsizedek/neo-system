import { createHmac, timingSafeEqual } from 'node:crypto';
const SAFE_ID=/^[A-Za-z0-9_-]{1,128}$/;
export function requireOperator(request,{secret,issuer='neo-pass',audience='neo-bmi',clock=()=>Date.now()}={}){
 if(typeof secret!=='string'||secret.length<32)throw new Error('operator authentication not configured');
 const auth=request.headers?.authorization;
 if(typeof auth!=='string'||!auth.startsWith('Bearer '))return {allowed:false,reason:'MISSING_TOKEN'};
 const token=auth.slice(7),parts=token.split('.');
 if(parts.length!==2)return {allowed:false,reason:'INVALID_TOKEN'};
 const [encoded,signature]=parts;
 if(!/^[A-Za-z0-9_-]{1,4096}$/.test(encoded)||!/^[A-Za-z0-9_-]{43}$/.test(signature))return {allowed:false,reason:'INVALID_TOKEN'};
 const expected=createHmac('sha256',secret).update(encoded).digest();
 let received;try{received=Buffer.from(signature,'base64url')}catch{return {allowed:false,reason:'INVALID_TOKEN'}}
 if(received.length!==expected.length||!timingSafeEqual(received,expected))return {allowed:false,reason:'INVALID_SIGNATURE'};
 let claims;try{claims=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'))}catch{return {allowed:false,reason:'INVALID_CLAIMS'}}
 if(claims.iss!==issuer||claims.aud!==audience||!SAFE_ID.test(claims.sub||'')||claims.role!=='bmi-reader'||!Number.isSafeInteger(claims.exp)||clock()/1000>=claims.exp)return {allowed:false,reason:'NOT_AUTHORIZED'};
 return {allowed:true,subject:claims.sub,role:claims.role};
}
export function createOperatorToken(claims,secret){
 if(!secret||secret.length<32)throw Error('secret length insufficient');
 const encoded=Buffer.from(JSON.stringify(claims)).toString('base64url');
 return encoded+'.'+createHmac('sha256',secret).update(encoded).digest('base64url');
}
// NOTE: HMAC tokens are a private staging fallback. Production requires verified NEOpass OIDC/JWKS.
