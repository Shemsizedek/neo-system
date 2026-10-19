// NEOB-027 atomic WebAuthn approval finalizer.
// Called ONLY after a trusted WebAuthn library has verified the real assertion.
// All authorization state transitions occur in one Firestore transaction.
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
export function createAtomicWalletFinalizer({db,clock=()=>Date.now()}={}){
 if(typeof db?.runTransaction!=='function')throw Error('atomic_wallet_db_required');
 const approvals=db.collection('neoBankWalletApprovals'),challenges=db.collection('neoBankWalletChallenges'),credentials=db.collection('neoMaskCredentials');
 return async function stageInTransaction(tx,{subject,digest,approvalId,challenge,credentialId,expectedCounter,newCounter,verified}){
  // ONLY a server-side assertion verifier may supply the verified receipt.
  // This method is not an HTTP route and must not receive client JSON directly.
  if(verified!==true||!subject||!/^[a-f0-9]{64}$/.test(String(digest))||
    typeof approvalId!=='string'||approvalId.length<8||
    typeof challenge!=='string'||challenge.length<32||
    typeof credentialId!=='string'||!credentialId||
    !Number.isSafeInteger(expectedCounter)||!Number.isSafeInteger(newCounter)||
    newCounter<=expectedCounter)throw Error('wallet_authentication_required');
  const ar=approvals.doc(hash(approvalId)),cr=challenges.doc(hash(challenge)),kr=credentials.doc(hash(credentialId));
  const [a,c,k]=await Promise.all([tx.get(ar),tx.get(cr),tx.get(kr)]);
  const permit=a.exists?a.data():null,nonce=c.exists?c.data():null,key=k.exists?k.data():null,now=clock();
  if(!permit||permit.state!=='pending'||permit.subject!==subject||permit.digest!==digest||
    permit.operation!=='ces.transfer'||permit.expiresAtMs<=now||
    !nonce||nonce.status!=='pending'||nonce.subject!==subject||nonce.digest!==digest||
    nonce.operation!=='ces.transfer'||nonce.approvalId!==approvalId||nonce.challenge!==challenge||
    nonce.expiresAtMs<=now||
    !key||key.subject!==subject||key.status!=='active'||key.rpId!=='connect.holytemples.org'||
    key.counter!==expectedCounter)throw Error('wallet_authorization_rejected');
  return entryId=>{
    if(!entryId)throw Error('wallet_entry_required');
    tx.update(ar,{state:'consumed',consumedAtMs:now,entryId});
    tx.update(cr,{status:'consumed',consumedAtMs:now,entryId});
    tx.update(kr,{counter:newCounter,updatedAtMs:now});
  };
 }
}
// For authentic synced passkeys with zero signature counters, a separately
// reviewed replay-proof, challenge-bound device policy is required.
// This adapter intentionally rejects zero/non-incrementing counters.
