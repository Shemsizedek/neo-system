// COUNTERPAY-012: Server-only registration + read-only wallet session coordinator.
// The caller MUST authenticate the user BEFORE starting enrollment.
// Durable credential, challenge, session repositories and actual WebAuthn verifier are injected.
import {randomBytes} from 'node:crypto';
export function createEnrollmentService({challengeStore,credentialRepository,verifyRegistration,origin,rpID,now=()=>Date.now()}){
 if(!challengeStore?.issue||!challengeStore?.consume||!credentialRepository?.create||typeof verifyRegistration!=='function')throw Error('Trusted enrollment dependencies required');
 if(typeof origin!=='string'||!origin.startsWith('https://')||!rpID)throw Error('Valid origin and RP ID required');
 return Object.freeze({
  async begin({userId}){
   if(typeof userId!=='string'||!userId.trim())throw Error('Authenticated user required');
   const challenge=randomBytes(32).toString('base64url');
   await challengeStore.issue(challenge,{userId,expiresAt:now()+120000,kind:'registration'});
   return Object.freeze({challenge,rpID,origin,timeout:120000,userVerification:'required',attestation:'none'});
  },
  async finish({userId,challenge,response}){
   if(!userId||!challenge||!response)throw Error('Incomplete registration');
   const pending=await challengeStore.consume(challenge);
   if(pending?.kind!=='registration'||pending.userId!==userId||pending.expiresAt<=now())throw Error('Registration challenge expired, used or user mismatch');
   const result=await verifyRegistration({response,expectedChallenge:challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
   const credential=result?.credential;
   if(result?.verified!==true||result?.userVerified!==true||!credential?.id||!credential.publicKey||!Number.isSafeInteger(credential.counter))throw Error('Registration verification failed');
   await credentialRepository.create({userId,id:credential.id,publicKey:credential.publicKey,counter:credential.counter,transports:credential.transports??[],revoked:false});
   return Object.freeze({registered:true,credentialId:credential.id,bitcoinSigned:false,broadcast:false});
  }
 });
}
export function createReadOnlySessionService({sessions,now=()=>Date.now()}){
 if(!sessions?.create||!sessions?.get||!sessions?.revoke)throw Error('Durable session repository required');
 return Object.freeze({
  async establish({userId,authentication}){
   if(!userId||authentication?.schema!=='neo.pass.webauthn-review.v1'||authentication.authenticated!==true||authentication.bitcoinSigned!==false||authentication.broadcast!==false)throw Error('Verified device authentication required');
   const token=randomBytes(32).toString('base64url');
   await sessions.create({token,userId,expiresAt:now()+900000,scope:'wallet:read'});
   return Object.freeze({token,expiresAt:now()+900000,scope:'wallet:read'});
  },
  async check({token,userId}){
   const record=await sessions.get(token);
   if(!record||record.userId!==userId||record.expiresAt<=now()||record.scope!=='wallet:read')throw Error('Session invalid or expired');
   return Object.freeze({userId,scope:'wallet:read',canSign:false,canBroadcast:false});
  },
  async logout({token}){await sessions.revoke(token);return {revoked:true}}
 });
}
