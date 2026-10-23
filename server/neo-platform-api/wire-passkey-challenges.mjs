// NEO-WIRE-004B: server-side WebAuthn challenge lifecycle (staging only).
// Credential signature verification MUST be performed by a standards-compliant
// WebAuthn verifier before consuming any challenge. This module is not a verifier.
import { randomBytes, timingSafeEqual } from 'node:crypto';

export class PasskeyChallengeStore {
  constructor({ttlMs=120000, now=()=>Date.now(), maxEntries=10000}={}) {
    this.ttlMs=ttlMs; this.now=now; this.maxEntries=maxEntries;
    this.challenges=new Map();
  }
  issue({memberId, operation, rpId}) {
    if(!memberId || !operation || !rpId) throw new Error('invalid_challenge_scope');
    this.sweep();
    if(this.challenges.size>=this.maxEntries) throw new Error('challenge_capacity_exceeded');
    const challenge=randomBytes(32).toString('base64url');
    this.challenges.set(challenge,{memberId,operation,rpId,expires:this.now()+this.ttlMs});
    return {challenge,expiresInMs:this.ttlMs};
  }
  // Call only AFTER verifying origin, RP ID, user presence/verification,
  // authenticator signature, credential ownership and counter policy.
  consumeVerified({challenge,memberId,operation,rpId}) {
    const record=this.challenges.get(challenge);
    if(!record) return false;
    this.challenges.delete(challenge); // one attempt, even on mismatch
    if(record.expires<=this.now()) return false;
    const equal=(a,b)=>{const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
    return equal(record.memberId,memberId)&&equal(record.operation,operation)&&equal(record.rpId,rpId);
  }
  sweep(){for(const [key,value] of this.challenges) if(value.expires<=this.now()) this.challenges.delete(key)}
}
