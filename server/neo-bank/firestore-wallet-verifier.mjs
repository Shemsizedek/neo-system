// NEOB-019: verification only. Approval consumption MUST occur atomically
// within createNeoBankFirestoreStore.transfer's Firestore transaction.
// This adapter never consumes an approval itself.
import {createHash} from 'node:crypto';
const keyOf=value=>createHash('sha256').update(String(value)).digest('hex');
export function createFirestoreWalletVerifier({db,verifyAssertion,clock=()=>Date.now()}={}){
 if(typeof db?.runTransaction!=='function'||typeof verifyAssertion!=='function')throw Error('wallet_verifier_unconfigured');
 const approvals=db.collection('neoBankWalletApprovals');
 return async function verifyApproval({subject,digest,approval,operation}){
  if(!subject||!/^[a-f0-9]{64}$/.test(String(digest))||operation!=='ces.transfer'||
     typeof approval?.id!=='string'||approval.id.length<8)return false;
  const ref=approvals.doc(keyOf(approval.id));
  const snap=await ref.get();
  if(!snap.exists)return false;
  const row=snap.data();
  if(row?.state!=='pending'||row.subject!==subject||row.digest!==digest||row.operation!==operation||
     typeof row.expiresAtMs!=='number'||row.expiresAtMs<=clock())return false;
  // Actual cryptographic verifier MUST check server-issued challenge, signature,
  // RP ID, origin, user verification, authenticated subject/tenant, and counter.
  // Never accept client assertions of verification. This is not a verifier
  // implementation: a trusted dependency must be supplied.
  return await verifyAssertion({subject,digest,operation,assertion:approval.assertion,approvalId:approval.id})===true;
 }
}
