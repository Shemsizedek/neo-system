// COUNTERPAY-010 — server-side WebAuthn challenge coordinator.
// No HTTP routes, wallet signing, Bitcoin authorization, or broadcast.
// Store MUST be a shared, atomic, TTL-backed implementation in production.
import {randomBytes} from 'node:crypto';
import {prepareDeviceReview} from './device-review.mjs';
export class InMemoryChallengeStore {
 #pending=new Map();
 async issue(key,value){if(this.#pending.has(key))throw Error('Duplicate challenge');this.#pending.set(key,value)}
 async consume(key){const result=this.#pending.get(key);if(!result)return null;this.#pending.delete(key);return result}
}
export function createApprovalCoordinator({store,verifyWebAuthn,origin,rpID,now=()=>Date.now()}){
 if(!store||typeof store.issue!=='function'||typeof store.consume!=='function')throw Error('Atomic challenge store required');
 if(typeof verifyWebAuthn!=='function')throw Error('Trusted WebAuthn verifier required');
 if(typeof origin!=='string'||!origin.startsWith('https://')||typeof rpID!=='string'||!rpID)throw Error('HTTPS origin and RP ID required');
 return Object.freeze({
  async issue({psbt,credentialId}){
   if(!credentialId||typeof credentialId!=='string')throw Error('Registered credential required');
   // This must run server side: a browser caller cannot supply the nonce.
   const nonce=randomBytes(32).toString('base64url');
   const request=await prepareDeviceReview({psbt,nonce,expiresAt:now()+120000,origin,now:now()});
   await store.issue(nonce,{request,credentialId});
   return Object.freeze({request,challenge:nonce,rpID,userVerification:'required'});
  },
  async verify({nonce,credentialId,assertion}){
   if(typeof nonce!=='string'||typeof credentialId!=='string'||!assertion)throw Error('Malformed approval');
   // Atomic consume BEFORE verification: even failed attempts cannot reuse a challenge.
   const pending=await store.consume(nonce);
   if(!pending)throw Error('Challenge absent or already consumed');
   const {request,credentialId:registered}=pending;
   if(request.expiresAt<=now()||credentialId!==registered)throw Error('Expired challenge or mismatched credential');
   const result=await verifyWebAuthn({assertion,expectedChallenge:nonce,expectedOrigin:origin,expectedRPID:rpID,credentialId,requireUserVerification:true});
   if(result?.verified!==true||result.userVerified!==true||result.credentialId!==registered)throw Error('WebAuthn cryptographic verification failed');
   // WebAuthn authenticates a device session; it is NOT a Bitcoin signature.
   return Object.freeze({schema:'neo.pass.webauthn-review.v1',network:request.network,psbtSha256:request.psbtSha256,credentialId,authenticated:true,bitcoinSigned:false,broadcast:false,signingEnabled:false});
  }
 });
}
