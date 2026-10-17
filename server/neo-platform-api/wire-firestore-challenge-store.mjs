// NEO-WIRE-004S: Firestore-backed, one-use WebAuthn challenges.
// Not mounted. Caller must provide a Firestore CollectionReference and enforce
// authentication, per-member rate limits and server-side signature verification.
import {randomBytes,timingSafeEqual} from 'node:crypto';
const equal=(a,b)=>{const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)};
export class FirestorePasskeyChallengeStore {
 constructor({collection,ttlMs=120000,now=()=>Date.now()}={}) {
  if(!collection?.doc||!collection?.firestore?.runTransaction) throw new Error('firestore_collection_required');
  this.collection=collection;this.ttlMs=ttlMs;this.now=now;
 }
 async issue({memberId,operation,rpId}) {
  if(!memberId||!operation||!rpId) throw new Error('invalid_challenge_scope');
  const challenge=randomBytes(32).toString('base64url');
  // Store only a random opaque document ID; never use a client-supplied path.
  await this.collection.doc(challenge).create({memberId,operation,rpId,expires:this.now()+this.ttlMs});
  return {challenge,expiresInMs:this.ttlMs};
 }
 async consumeVerified({challenge,memberId,operation,rpId}) {
  if(typeof challenge!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(challenge)) return false;
  const ref=this.collection.doc(challenge);
  return this.collection.firestore.runTransaction(async tx=>{
   const snapshot=await tx.get(ref);
   if(!snapshot.exists) return false;
   const record=snapshot.data();
   tx.delete(ref); // burn the attempt atomically even on scope mismatch
   return record.expires>this.now()&&equal(record.memberId,memberId)&&equal(record.operation,operation)&&equal(record.rpId,rpId);
  });
 }
}
