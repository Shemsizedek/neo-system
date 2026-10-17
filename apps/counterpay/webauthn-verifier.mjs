// Server-only SimpleWebAuthn adapter for CounterPay/NEO Pass.
// Authentication is NOT a Bitcoin signature or authorization to broadcast.
import {verifyAuthenticationResponse} from '@simplewebauthn/server';
export function createWebAuthnVerifier({credentialRepository}){
 if(!credentialRepository||typeof credentialRepository.get!=='function'||typeof credentialRepository.updateCounter!=='function')throw Error('Persistent credential repository required');
 return async ({assertion,expectedChallenge,expectedOrigin,expectedRPID,credentialId,requireUserVerification})=>{
  if(!assertion||assertion.id!==credentialId||assertion.rawId!==credentialId)throw Error('Credential ID mismatch');
  const registered=await credentialRepository.get(credentialId);
  if(!registered||registered.revoked||!registered.publicKey||!Number.isSafeInteger(registered.counter)||registered.counter<0)throw Error('Credential not registered');
  const credential={id:credentialId,publicKey:new Uint8Array(registered.publicKey),counter:registered.counter,transports:registered.transports||[]};
  const result=await verifyAuthenticationResponse({response:assertion,expectedChallenge,expectedOrigin,expectedRPID,credential,requireUserVerification:true});
  if(!result.verified)throw Error('WebAuthn assertion rejected');
  // Repository must use atomic compare-and-update on credential counter.
  const advanced=await credentialRepository.updateCounter(credentialId,registered.counter,result.authenticationInfo.newCounter);
  if(advanced!==true)throw Error('Credential counter update rejected');
  return {verified:true,userVerified:true,credentialId};
 };
}
