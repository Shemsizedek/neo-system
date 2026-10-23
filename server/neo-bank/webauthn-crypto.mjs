// NEOB-030 genuine WebAuthn assertion verifier (no simulation fallback).
// Requires @simplewebauthn/server; caller supplies trusted credential and
// challenge records from the server, never client-provided keys or challenges.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export function createWebAuthnCryptoVerifier({library,origin='https://connect.holytemples.org',rpID='connect.holytemples.org'}={}){
 if(origin!=='https://connect.holytemples.org'||rpID!=='connect.holytemples.org')throw Error('invalid_webauthn_rp');
 const verify=library?.verifyAuthenticationResponse;
 if(typeof verify!=='function')throw Error('webauthn_crypto_library_required');
 return async function verifySignedAssertion({assertion,challenge,credential}){
  if(!assertion||!challenge?.challenge||!credential?.publicKey||!credential?.id||
     !Number.isSafeInteger(credential.counter)||credential.counter<0)return {verified:false};
  const key=Buffer.from(credential.publicKey,'base64url');
  if(key.length<20)return {verified:false};
  try{
   const result=await verify({
    response:assertion,expectedChallenge:challenge.challenge,
    expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true,
    credential:{id:credential.id,publicKey:key,counter:credential.counter,
      transports:Array.isArray(credential.transports)?credential.transports:undefined}
   });
   const nextCounter=result?.authenticationInfo?.newCounter;
   if(result?.verified!==true||result?.authenticationInfo?.userVerified!==true||
      !Number.isSafeInteger(nextCounter)||nextCounter<=credential.counter)return {verified:false};
   return {verified:true,credentialId:credential.id,expectedCounter:credential.counter,newCounter:nextCounter};
  }catch{return {verified:false}}
 }
}
export function loadWebAuthnCryptoLibrary(){
 try{return require('@simplewebauthn/server')}catch{throw Error('webauthn_crypto_library_required')}
}
