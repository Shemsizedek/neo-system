// NEOB-009: verifier adapter. No signature is accepted without a trusted implementation.
// The finalized BIP-322 format uses smp/ful/pof prefixes. This adapter only permits simple (smp) proofs.\n// Library must validate actual signatures, scripts and address; proof-of-funds and full proofs remain disabled.
export async function verifyWalletProof(challenge,input,{verifySignature,clock=Date.now}={}){
 if(!challenge||challenge.consumed||challenge.status!=='UNVERIFIED')throw new Error('wallet_challenge_unavailable');
 if(!Number.isFinite(Date.parse(challenge.expiresAt))||clock()>=Date.parse(challenge.expiresAt))throw new Error('wallet_challenge_expired');
 if(!input||input.challengeId!==challenge.challengeId||input.address!==challenge.address||input.network!==challenge.network)throw new Error('wallet_challenge_mismatch');
 if(typeof input.signature!=='string'||!input.signature||input.signature.length>5000)throw new Error('invalid_wallet_signature');
 if(input.scheme!=='BIP322'||! /^smp(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.signature))throw new Error('unsupported_wallet_signature_format');
 if(typeof verifySignature!=='function')throw new Error('wallet_verifier_not_configured');
 const accepted=await verifySignature({message:challenge.message,address:challenge.address,network:challenge.network,signature:input.signature,scheme:input.scheme});
 if(accepted!==true)throw new Error('wallet_signature_invalid');
 return {status:'VERIFIED_PROOF',challengeId:challenge.challengeId,nmniAccountId:challenge.nmniAccountId,address:challenge.address,network:challenge.network};
}
export function cesReadAdapterConfig({approved=false,endpoint}={}){
 // No legacy credentials or browser automation; future official integration only.
 return {status:approved&&typeof endpoint==='string'&&endpoint.startsWith('https://')?'READY_FOR_REVIEW':'DISABLED',readOnly:true,automatedLogin:false,transactionsEnabled:false};
}
