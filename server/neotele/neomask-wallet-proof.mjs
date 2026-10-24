// NTEL-017: verify NeoMask Bitcoin ownership using an injected trusted
// BIP-322 verifier. This module does not implement consensus script validation.
export function createNeoTeleWalletProof({verifyBip322,consumeNonce,resolveSession}={}) {
 for(const [key,fn] of Object.entries({verifyBip322,consumeNonce,resolveSession})) if(typeof fn!=='function') throw Error('adapter_required:'+key);
 return async function verify({sessionToken,address,signature,nonce}={}){
   if(!sessionToken||typeof address!=='string'||!address||typeof signature!=='string'||!signature||typeof nonce!=='string'||!nonce) throw Error('wallet_proof_missing');
   const session=await resolveSession(sessionToken);
   if(!session?.verified||!session.subject) throw Error('neopass_authentication_required');
   const message=['NeoTele NeoMask ownership','subject='+session.subject,'nonce='+nonce,'purpose=nontransferable-esim-entitlement'].join('\n');
   const result=await verifyBip322({address,signature,message});
   if(result?.valid!==true) throw Error('wallet_signature_invalid');
   const used=await consumeNonce({subject:session.subject,nonce,address,purpose:'NEOTELE_ENTITLEMENT'});
   if(used!==true) throw Error('wallet_proof_replayed_or_expired');
   return Object.freeze({subject:session.subject,ownershipVerified:true,proofType:'BIP322',nonceConsumed:true,tokenPublished:false});
 };
}
