import {randomBytes,createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const hash=value=>createHash('sha256').update(value).digest('base64url');
const opaque=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
const issuer='https://accounts.google.com';
// Server-only component. HTTP must supply browser and session handles from
// Secure HttpOnly cookies, enforce same-origin POST and never log credentials.
export function createNoogleGoogleLogin({clientId,origin,store,resolveMember,keySet,now=Date.now}={}){
 if(typeof clientId!=='string'||!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)||new URL(origin).protocol!=='https:'||new URL(origin).origin!==origin||typeof resolveMember!=='function'||['issue','take','read'].some(name=>typeof store?.[name]!=='function'))throw Error('google_login_configuration_required');
 const keys=keySet||createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000});
 async function member(providerSubject){
  const result=await resolveMember({issuer,providerSubject});
  if(result?.active!==true||typeof result.canonicalSubject!=='string'||!result.canonicalSubject)throw Error('existing_member_required');
  return result.canonicalSubject;
 }
 return Object.freeze({
  async begin(browserHandle){
   if(!opaque(browserHandle))throw Error('browser_session_required');
   const id=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('base64url');
   await store.issue('google-challenge:'+hash(id),{browserHash:hash(browserHandle),nonce,expiresAt:now()+300000});
   return {id,nonce,clientId};
  },
  async complete(browserHandle,{id,credential}={}){
   if(!opaque(browserHandle)||!opaque(id)||typeof credential!=='string'||credential.length>16384)throw Error('invalid_google_response');
   const ceremony=await store.take('google-challenge:'+hash(id));
   if(!ceremony||ceremony.browserHash!==hash(browserHandle)||ceremony.expiresAt<=now())throw Error('google_challenge_rejected');
   const {payload}=await jwtVerify(credential,keys,{algorithms:['RS256'],issuer:[issuer,'accounts.google.com'],audience:clientId,maxTokenAge:'5m',requiredClaims:['sub','iat','exp','nonce'],currentDate:new Date(now())});
   if(payload.nonce!==ceremony.nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255||payload.azp!==undefined&&payload.azp!==clientId)throw Error('google_identity_rejected');
   const canonicalSubject=await member(payload.sub),sessionHandle=randomBytes(32).toString('base64url'),authenticatedAt=now();
   const expiresAt=Math.min(authenticatedAt+300000,payload.exp*1000);
   if(expiresAt<=authenticatedAt||ceremony.expiresAt<=authenticatedAt)throw Error('google_challenge_rejected');
   await store.issue('google-session:'+hash(sessionHandle),{canonicalSubject,providerSubject:payload.sub,authenticatedAt,expiresAt});
   return {sessionHandle,expiresAt};
  },
  async resolveEnrollmentIdentity(sessionHandle){
   if(!opaque(sessionHandle))return null;
   const record=await store.read('google-session:'+hash(sessionHandle));
   if(!record||record.expiresAt<=now())return null;
   try{
    if(await member(record.providerSubject)!==record.canonicalSubject)return null;
    return {verified:true,issuer,providerSubject:record.providerSubject,canonicalSubject:record.canonicalSubject,audience:origin,authenticatedAt:record.authenticatedAt};
   }catch{return null;}
  },
  async signOut(sessionHandle){if(opaque(sessionHandle))await store.take('google-session:'+hash(sessionHandle));}
 });
}
