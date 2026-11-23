import {randomBytes,createHash} from 'node:crypto';
import {importJWK,jwtVerify} from 'jose';
const random=()=>randomBytes(32).toString('base64url'),hash=v=>createHash('sha256').update(v).digest('base64url');
// Server-side relying-party adapter. Keep transactionHandle in a Secure HttpOnly
// SameSite=Lax cookie at the client site; never accept it from callback JSON.
export async function createNoogleLoginClient({issuer,clientId,redirectUri,publicJwk,store,transport=fetch,now=Date.now}={}){
 if(new URL(issuer).origin!==issuer||!issuer.startsWith('https://')||!clientId||!redirectUri.startsWith('https://')||new URL(redirectUri).hash||typeof store?.issue!=='function'||typeof store?.take!=='function'||publicJwk?.alg!=='ES256')throw Error('login_client_configuration_required');
 const callbackUrl=new URL(redirectUri);if(callbackUrl.username||callbackUrl.password||callbackUrl.search)throw Error('exact_callback_required');
 const key=await importJWK(publicJwk,'ES256');
 return {
  async begin(){
   const state=random(),nonce=random(),verifier=random(),transactionHandle=random();
   await store.issue('client:'+hash(transactionHandle),{state,nonce,verifier,expiresAt:now()+300000});
   const url=new URL('/oidc/authorize',issuer);url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:'openid',state,nonce,code_challenge:hash(verifier),code_challenge_method:'S256'}).toString();
   return {authorizationUrl:url.href,transactionHandle};
  },
  async complete(callback,transactionHandle){
   if(typeof transactionHandle!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(transactionHandle))throw Error('invalid_callback');
   const url=new URL(callback),expected=new URL(redirectUri);
   if(url.origin!==expected.origin||url.pathname!==expected.pathname)throw Error('invalid_callback');
   for(const name of url.searchParams.keys())if(!['code','state'].includes(name)||url.searchParams.getAll(name).length!==1)throw Error('invalid_callback');
   const transaction=await store.take('client:'+hash(transactionHandle));
   if(!transaction||transaction.expiresAt<=now()||url.searchParams.get('state')!==transaction.state||!/^[A-Za-z0-9_-]{43}$/.test(url.searchParams.get('code')||''))throw Error('invalid_callback');
   const response=await transport(issuer+'/oidc/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code:url.searchParams.get('code'),client_id:clientId,redirect_uri:redirectUri,code_verifier:transaction.verifier}).toString()});
   if(!response.ok)throw Error('token_exchange_failed');const data=await response.json();
   const {payload,protectedHeader}=await jwtVerify(data.id_token,key,{issuer,audience:clientId,algorithms:['ES256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:300,currentDate:new Date(now())});
   if(payload.nonce!==transaction.nonce||protectedHeader.kid!==publicJwk.kid||typeof payload.sub!=='string'||!payload.sub)throw Error('identity_token_rejected');
   return {subject:payload.sub,issuer,verified:true};
  }
 };
}
