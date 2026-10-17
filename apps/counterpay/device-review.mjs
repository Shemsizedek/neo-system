// CounterPay-009: cryptographic binding of an unsigned PSBT to a device-review request.
// No authentication assertion is accepted as a Bitcoin signature. No transaction broadcast.
const hex = b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function prepareDeviceReview({psbt,nonce,expiresAt,origin,cryptoImpl=globalThis.crypto,now=Date.now()}){
 if(psbt?.schema!=='counterpay.bip174-unsigned.v1'||psbt.unsigned!==true||psbt.broadcast!==false||typeof psbt.psbtBase64!=='string'||!psbt.psbtBase64.length)throw Error('Unsigned PSBT required');
 if(!['mainnet','testnet'].includes(psbt.network))throw Error('Unsupported network');
 if(typeof nonce!=='string'||!/^[a-zA-Z0-9_-]{22,128}$/.test(nonce))throw Error('Unpredictable nonce required');
 if(typeof origin!=='string'||!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin))throw Error('HTTPS origin required');
 if(!Number.isSafeInteger(expiresAt)||expiresAt<=now||expiresAt>now+300000)throw Error('Review must expire within five minutes');
 if(!cryptoImpl?.subtle?.digest)throw Error('WebCrypto SHA-256 required');
 const bytes=new TextEncoder().encode(psbt.psbtBase64);
 const commitment=hex(await cryptoImpl.subtle.digest('SHA-256',bytes));
 return Object.freeze({schema:'neo.pass.psbt-authorization-request.v1',network:psbt.network,psbtSha256:commitment,nonce,expiresAt,origin,feeSats:psbt.feeSats,outputs:psbt.outputs,status:'PENDING_VERIFICATION',authorized:false,signingEnabled:false,broadcast:false});
}
export function verifyAuthorizationReceipt(request,receipt,{now=Date.now(),expectedOrigin}={}){
 if(request?.schema!=='neo.pass.psbt-authorization-request.v1'||request.expiresAt<=now||request.origin!==expectedOrigin)throw Error('Expired or wrong-origin challenge');
 if(receipt?.schema!=='neo.pass.psbt-receipt.v1'||receipt.nonce!==request.nonce||receipt.psbtSha256!==request.psbtSha256||receipt.origin!==request.origin||receipt.network!==request.network)throw Error('Authorization receipt binding mismatch');
 // Not a WebAuthn verifier. An external trusted verifier must validate RP ID,
 // origin, challenge, UV flag, signature, credential and replay resistance.
 return Object.freeze({matched:true,cryptographicallyVerified:false,bitcoinAuthorized:false,signingEnabled:false,broadcast:false,reason:'Receipt matches request fields only; WebAuthn verification required'});
}
export function crownEvidenceForReview(request){
 if(request?.schema!=='neo.pass.psbt-authorization-request.v1'||request.authorized!==false)throw Error('Unverified review only');
 return Object.freeze({schema:'neo.crown-chain.psbt-review-evidence.v1',psbtSha256:request.psbtSha256,network:request.network,nonce:request.nonce,attested:false,bitcoinAnchored:false,settled:false});
}
