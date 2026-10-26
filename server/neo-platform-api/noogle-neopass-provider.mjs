import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';

const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(v);
const hash=v=>createHash('sha256').update(v).digest('base64url');
// Server-only grant core, not an OIDC server or token endpoint. Production needs
// durable atomic storage, authenticated consent UI and a reviewed OIDC issuer.
export function createNoogleNeopassProvider({clients,store,authenticate,approve,isActive,pairwiseSecret,now=Date.now}={}){
 if(!Array.isArray(clients)||!store||typeof store.issue!=='function'||typeof store.take!=='function'||
    [authenticate,approve,isActive].some(fn=>typeof fn!=='function')||typeof pairwiseSecret!=='string'||pairwiseSecret.length<32)throw Error('provider_configuration_required');
 const registry=new Map();
 for(const client of clients){
  if(!client||typeof client.id!=='string'||!client.id||registry.has(client.id)||typeof client.name!=='string'||!Array.isArray(client.redirects)||!client.redirects.length)throw Error('invalid_client');
  const redirects=client.redirects.map(value=>{const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.href!==value)throw Error('https_callback_required');return value;});
  registry.set(client.id,Object.freeze({id:client.id,name:client.name,redirects:Object.freeze(redirects)}));
 }
 function request(input){
  if(!input||Object.keys(input).some(k=>!['client_id','redirect_uri','response_type','scope','state','nonce','code_challenge','code_challenge_method'].includes(k)))throw Error('invalid_authorization_request');
  const client=registry.get(input.client_id);
  if(!client||!client.redirects.includes(input.redirect_uri)||input.response_type!=='code'||input.scope!=='openid'||!opaque(input.state)||!opaque(input.nonce)||!opaque(input.code_challenge)||input.code_challenge.length!==43||input.code_challenge_method!=='S256')throw Error('invalid_authorization_request');
  return {client,...input};
 }
 return Object.freeze({
  inspect(input){const value=request(input);return {clientId:value.client.id,clientName:value.client.name,redirectUri:value.redirect_uri,scope:'openid'};},
  async authorize(input,sessionHandle){
   const checked=request(input),identity=await authenticate(sessionHandle);
   if(!identity||typeof identity.subject!=='string'||!identity.subject||identity.verified!==true)throw Error('authentication_required');
   if(await isActive(identity.subject)!==true)throw Error('identity_inactive');
   const consent=Object.freeze({subject:identity.subject,clientId:checked.client.id,clientName:checked.client.name,redirectUri:checked.redirect_uri,scopes:Object.freeze(['openid'])});
   if(await approve(consent)!==true)throw Error('consent_required');
   const code=randomBytes(32).toString('base64url');
   await store.issue(hash(code),{subject:identity.subject,clientId:checked.client.id,redirectUri:checked.redirect_uri,challenge:checked.code_challenge,nonce:checked.nonce,authTime:identity.authTime,expiresAt:now()+120000});
   const target=new URL(checked.redirect_uri);target.searchParams.set('code',code);target.searchParams.set('state',checked.state);
   return Object.freeze({redirect:target.href});
  },
  async redeem({code,client_id,redirect_uri,code_verifier}={}){
   const client=registry.get(client_id);
   if(!client||!client.redirects.includes(redirect_uri)||!opaque(code)||code.length!==43||typeof code_verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(code_verifier))throw Error('invalid_grant');
   const grant=await store.take(hash(code)); // Must consume atomically, once.
   const actual=Buffer.from(hash(code_verifier)),expected=Buffer.from(grant?.challenge||'');
   if(!grant||grant.expiresAt<=now()||grant.clientId!==client_id||grant.redirectUri!==redirect_uri||actual.length!==expected.length||!timingSafeEqual(actual,expected)||await isActive(grant.subject)!==true)throw Error('invalid_grant');
   const sub=createHmac('sha256',pairwiseSecret).update(JSON.stringify([client_id,grant.subject])).digest('base64url');
   // Identity only. Wallet addresses, balances, emails and roles need separate consent.
   return Object.freeze({audience:client_id,subject:sub,nonce:grant.nonce,scope:'openid',expiresIn:300,tokenIssuanceRequired:true});
  }
 });
}
