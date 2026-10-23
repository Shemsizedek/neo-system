import { createHash } from 'node:crypto'
const addressPattern = /^[13bc][a-zA-Z0-9]{20,90}$/
export function verifyWalletChallenge({address,challenge,signature,verifySignature}){
 if(typeof address !== 'string'||!addressPattern.test(address)) throw new TypeError('unsupported address format')
 if(typeof challenge !== 'string'||!challenge.startsWith('NEO-Careers:')||challenge.length<32)throw new TypeError('invalid challenge')
 if(typeof signature !== 'string'||!signature.trim())throw new TypeError('signature required')
 if(typeof verifySignature !== 'function')throw new TypeError('trusted signature verifier required')
 // Caller must enforce challenge nonce expiration, origin binding and single-use storage.
 return Promise.resolve(verifySignature({address,challenge,signature})).then(valid=>({
  verified:valid===true,
  purpose:'wallet-control-only',
  identityVerified:false,
  payrollAuthorized:false
 }))
}
export function verifyRegistryObservation({asset,issuerReference,network,txid,source,independentlyChecked}){
 if(typeof asset!=='string'||!/^[A-Z0-9._-]{1,48}$/.test(asset))throw new TypeError('invalid asset')
 if(typeof issuerReference!=='string'||!issuerReference.trim())throw new TypeError('issuer required')
 if(network!=='bitcoin-counterparty')throw new TypeError('unsupported network')
 if(typeof txid!=='string'||!/^[a-f0-9]{64}$/.test(txid))throw new TypeError('invalid txid')
 if(!['counterparty-node','neo-scan'].includes(source))throw new TypeError('unrecognized source')
 const receipt=createHash('sha256').update(JSON.stringify({asset,issuerReference,network,txid,source})).digest('hex')
 return Object.freeze({asset,issuerReference,txid,source,receipt,verification:independentlyChecked===true?'source-attested-needs-independent-review':'unverified',payrollEligible:false,equityEligible:false})
}
