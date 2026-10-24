// NTEL-012: verify the result of a trusted Guardian WebAuthn verifier;
// never accept a browser-supplied verified flag as proof.
export function createGuardianProofGate({verifyWebAuthn,consumeChallenge,loadEvidence}={}){
 for(const [name,fn] of Object.entries({verifyWebAuthn,consumeChallenge,loadEvidence})) if(typeof fn!=='function') throw Error('adapter_required:'+name);
 return async function verify({subject,reference,decision,assertion}={}){
  if(!subject||!reference||!['APPROVED','REJECTED'].includes(decision)||!assertion) throw Error('invalid_guardian_request');
  const record=await loadEvidence(reference);
  if(!record||record.status!=='PENDING_REVIEW'||record.submitter===subject) throw Error('evidence_not_reviewable');
  const verified=await verifyWebAuthn({subject,reference,decision,revision:record.revision,digest:record.digest,assertion});
  if(verified?.verified!==true||verified.subject!==subject||verified.reference!==reference||verified.decision!==decision||
     verified.revision!==record.revision||verified.digest!==record.digest||!verified.challengeId||!verified.credentialId) throw Error('guardian_signature_invalid');
  const consumed=await consumeChallenge({challengeId:verified.challengeId,subject,reference,decision,revision:record.revision,digest:record.digest});
  if(consumed!==true) throw Error('guardian_challenge_reused_or_expired');
  return {verified:true,subject,reference,decision,id:verified.challengeId};
 };
}
