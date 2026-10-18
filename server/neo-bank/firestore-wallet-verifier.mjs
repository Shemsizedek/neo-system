// NEOB-018: durable one-time approval adapter for CES transfers.
// The upstream WebAuthn assertion verifier is required and must validate
// signature, challenge, RP ID, origin, user verification, sign counter,
// NEO Pass subject, tenant, and bound transaction digest.
import {createHash} from 'node:crypto';
const keyOf=value=>createHash('sha256').update(String(value)).digest('hex');
export function createFirestoreWalletVerifier({db,verifyAssertion,clock=()=>Date.now()}={}){
 if(typeof db?.runTransaction!=='function'||typeof verifyAssertion!=='function')throw Error('wallet_verifier_unconfigured');
 const approvals=db.collection('neoBankWalletApprovals');
 return async function verifyApproval({subject,digest,approval,operation}){
  if(!subject||!/^[a-f0-9]{64}$/.test(String(digest))||operation!=='ces.transfer'||!approval?.id||typeof approval.id!=='string')return false;
  const ref=approvals.doc(keyOf(approval.id));
  // Cryptographic assertion verification happens before consuming the record.
  // It MUST NOT trust a client-supplied verified flag or public key.
  const proof=await verifyAssertion({subject,digest,operation,assertion:approval.assertion,approvalId:approval.id});
  if(proof!==true)return false;
  return db.runTransaction(async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists)return false;
   const row=snap.data();
   if(row?.state!=='pending'||row.subject!==subject||row.digest!==digest||row.operation!==operation||
      typeof row.expiresAtMs!=='number'||row.expiresAtMs<=clock())return false;
   tx.update(ref,{state:'consumed',consumedAtMs:clock()});
   return true;
  });
 }
}
// Persisting pending records requires a separately authenticated issuer service.
// Inserting records from an untrusted client would defeat the approval control.
