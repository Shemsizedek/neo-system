// NEOB-026: trusted server-side challenge creation and immutable intent binding.
// Must be called after an independently verified NEO Pass session.
// No public endpoint or client-controlled challenge writer is exposed here.
import {randomBytes,createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
export function createNeoMaskChallengeIssuer({db,clock=()=>Date.now(),ttlMs=120000}={}){
 if(!db?.collection||typeof db?.runTransaction!=='function'||!Number.isSafeInteger(ttlMs)||ttlMs<10000||ttlMs>300000)
  throw Error('challenge_issuer_unconfigured');
 const approvals=db.collection('neoBankWalletApprovals'),challenges=db.collection('neoBankWalletChallenges');
 return Object.freeze({
  async issue({subject,digest,operation,approvalId,authenticatedSubject}){
   if(!subject||subject!==authenticatedSubject||!/^[a-f0-9]{64}$/.test(String(digest))||
      operation!=='ces.transfer'||typeof approvalId!=='string'||approvalId.length<8)
    throw Error('challenge_identity_or_intent_rejected');
   const now=clock(),nonce=randomBytes(32).toString('base64url');
   let expiresAtMs;
   const ref=challenges.doc(hash(nonce)),approvalRef=approvals.doc(hash(approvalId));
   await db.runTransaction(async tx=>{
    const approval=await tx.get(approvalRef);
    const a=approval.exists?approval.data():null;
    if(!a||a.state!=='pending'||a.subject!==subject||a.digest!==digest||
       a.operation!==operation||!Number.isFinite(a.expiresAtMs)||a.expiresAtMs<=now)
     throw Error('challenge_approval_unavailable');
    expiresAtMs=Math.min(a.expiresAtMs,now+ttlMs);
    tx.create(ref,{subject,digest,operation,approvalId,challenge:nonce,
      expiresAtMs,createdAtMs:now,status:'pending'});
   });
   return {challenge:nonce,expiresAtMs};
  },
  async lookup({subject,digest,operation,approvalId,challenge}){
   if(typeof challenge!=='string'||!challenge)return null;
   const snap=await challenges.doc(hash(challenge)).get();
   if(!snap.exists)return null;
   const row=snap.data();
   if(row?.status!=='pending'||row.subject!==subject||row.digest!==digest||
      row.operation!==operation||row.approvalId!==approvalId||row.challenge!==challenge||
      !Number.isFinite(row.expiresAtMs)||row.expiresAtMs<=clock())return null;
   return row;
  }
 });
}
// IMPORTANT: approval posting must also consume the matching challenge and
// advance credential counter in the SAME atomic Firestore transaction.
// Until this occurs, replay prevention is incomplete and this component is staging-only.
