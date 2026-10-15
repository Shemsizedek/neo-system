// Internal-only proof capability. This is NOT a public HTTP endpoint.
// Only the credential verifier receives issue(), registry receives consume().
export function createVerifiedProofGate() {
 const issued=new WeakSet();
 const consumed=new WeakSet();
 const issuer=Object.freeze({
   issue({subject,credentialId,publicKey}) {
     if(typeof subject!=='string'||!subject||typeof credentialId!=='string'||!credentialId||
       typeof publicKey!=='string'||publicKey.length<32)throw Error('invalid_verified_proof');
     const proof=Object.freeze({subject,credentialId,publicKey});
     issued.add(proof);
     return proof;
   }
 });
 const consumer=Object.freeze({
   consume(proof,subject) {
     if(!proof || !issued.has(proof) || consumed.has(proof) || proof.subject!==subject)
       throw Error('verified_proof_required');
     consumed.add(proof);
     return {credentialId:proof.credentialId,publicKey:proof.publicKey};
   }
 });
 return Object.freeze({issuer,consumer});
}
