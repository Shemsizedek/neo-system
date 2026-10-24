import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse} from '@simplewebauthn/server';

const hash=v=>createHash('sha256').update(v).digest('hex');
const handle=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(v);
// Isolated server service. HTTP must bind browserHandle to a secure server cookie.
export function createNooglePasskeyAccounts({rpId,origin,store,now=Date.now}={}){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.origin!==origin||url.hostname!==rpId||!store||['issue','take','register','credential','commitLogin','session','active'].some(k=>typeof store[k]!=='function'))throw Error('passkey_account_configuration_required');
 return Object.freeze({
  async beginRegistration(browserHandle){
   if(!handle(browserHandle))throw Error('browser_session_required');
   const subject=randomUUID(),userHandle=randomBytes(32);
   const options=await generateRegistrationOptions({rpName:'Noogle NEOpass',rpID:rpId,userID:userHandle,userName:subject,attestationType:'none',supportedAlgorithmIDs:[-7],authenticatorSelection:{residentKey:'required',userVerification:'required'}});
   const id=randomUUID();await store.issue(id,{purpose:'register',browserHash:hash(browserHandle),subject,userHandle:userHandle.toString('base64url'),challenge:options.challenge,expiresAt:now()+300000});
   return {id,options};
  },
  async finishRegistration(browserHandle,{id,response}={}){
   if(!handle(browserHandle))throw Error('browser_session_required');
   const ceremony=await store.take(id,'register',hash(browserHandle),now());if(!ceremony)throw Error('ceremony_expired_or_replayed');
   const result=await verifyRegistrationResponse({response,expectedChallenge:ceremony.challenge,expectedOrigin:origin,expectedRPID:rpId,requireUserVerification:true,supportedAlgorithmIDs:[-7]});
   if(!result.verified||!result.registrationInfo||ceremony.expiresAt<=now())throw Error('registration_rejected');
   const info=result.registrationInfo;
   await store.register({subject:ceremony.subject,userHandle:ceremony.userHandle,id:info.credential.id,publicKey:Buffer.from(info.credential.publicKey).toString('base64url'),counter:info.credential.counter,transports:info.credential.transports||[],deviceType:info.credentialDeviceType,backedUp:info.credentialBackedUp});
   return {registered:true,loginRequired:true};
  },
  async beginLogin(browserHandle){
   if(!handle(browserHandle))throw Error('browser_session_required');
   const options=await generateAuthenticationOptions({rpID:rpId,userVerification:'required'}),id=randomUUID();
   await store.issue(id,{purpose:'authenticate',browserHash:hash(browserHandle),challenge:options.challenge,expiresAt:now()+300000});return {id,options};
  },
  async finishLogin(browserHandle,{id,response}={}){
   if(!handle(browserHandle))throw Error('browser_session_required');
   const ceremony=await store.take(id,'authenticate',hash(browserHandle),now());if(!ceremony)throw Error('ceremony_expired_or_replayed');
   const credential=await store.credential(response?.id);
   if(!credential||await store.active(credential.subject)!==true||response?.response?.userHandle!==credential.userHandle)throw Error('credential_rejected');
   const result=await verifyAuthenticationResponse({response,expectedChallenge:ceremony.challenge,expectedOrigin:origin,expectedRPID:rpId,requireUserVerification:true,credential:{id:credential.id,publicKey:Buffer.from(credential.publicKey,'base64url'),counter:credential.counter,transports:credential.transports}});
   if(!result.verified||ceremony.expiresAt<=now())throw Error('authentication_rejected');
   const token=randomBytes(32).toString('base64url'),expiresAt=now()+900000;
   if(await store.commitLogin({credentialId:credential.id,subject:credential.subject,oldCounter:credential.counter,newCounter:result.authenticationInfo.newCounter,sessionHash:hash(token),expiresAt,authTime:now()})!==true)throw Error('credential_changed_or_revoked');
   // Set this handle only as a Secure HttpOnly SameSite cookie, never a URL.
   return {sessionHandle:token,expiresAt};
  },
  async authenticate(token){
   if(!handle(token))return null;const session=await store.session(hash(token),now());
   return session&&await store.active(session.subject)===true?{subject:session.subject,verified:true,authTime:session.authTime,assurance:'passkey-user-verified'}:null;
  }
 });
}
