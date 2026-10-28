import {createHash, createPublicKey, verify as verifySignature} from 'node:crypto';
const hash = b => createHash('sha256').update(b).digest('hex');
const isHex = (s,n=64)=>typeof s==='string'&&new RegExp('^[a-f0-9]{'+n+'}$','i').test(s);
/**
 * Crown Chain issuance gate: no transaction creation, signing, or broadcast.
 * Only accepts independently obtained ledger evidence and a cryptographically
 * verifiable Ed25519 attestation signed by a registered Crown Chain key.
 * Wallet-control verification is a SEPARATE Bitcoin signature/Counterparty check.
 */
export function checkIssuancePackage(p, {trustedAttestationPublicKeys={}, ledgerVerifier}={}) {
 const errors=[];
 if(!p || p.schema!=='NEO-CROWN-ISSUANCE-V1') errors.push('schema');
 if(!p?.asset || !/^[A-Z0-9_.-]{1,32}$/.test(p.asset)) errors.push('asset');
 if(p?.chain!=='bitcoin-mainnet' || p?.protocol!=='counterparty') errors.push('network');
 if(!isHex(p?.media?.sha256)||p?.media?.algorithm!=='sha256') errors.push('media_digest');
 if(!p?.media?.url?.startsWith('https://')) errors.push('media_url');
 if(!isHex(p?.evidence?.issuance_txid)) errors.push('issuance_txid');
 if(!p?.evidence?.issuer_address || !p?.evidence?.asset_owner_address) errors.push('issuer_owner');
 if(!p?.evidence?.issuer_signature || !p?.evidence?.signed_message) errors.push('issuer_signature');
 if(p?.evidence?.issuer_signature_verified!==true || p?.evidence?.ledger_verified!==true) errors.push('external_verification_required');
 if(p?.evidence?.source!=='counterparty_live') errors.push('ledger_source');
 if(typeof ledgerVerifier!=='function') errors.push('independent_ledger_verifier_required');
 else {
   try {if(ledgerVerifier(p)!==true) errors.push('ledger_mismatch');}
   catch{errors.push('ledger_verifier_failed');}
 }
 const key=p?.attestation?.key_id&&trustedAttestationPublicKeys[p.attestation.key_id];
 if(!key || !p?.attestation?.signature_base64) errors.push('attestation');
 else {
   try {
     const {attestation,...payload}=p;
     const message=Buffer.from(JSON.stringify(payload));
     if(!verifySignature(null,message,createPublicKey(key),Buffer.from(attestation.signature_base64,'base64'))) errors.push('attestation_signature_invalid');
   } catch {errors.push('attestation_signature_invalid');}
 }
 if(p?.confidential?.plaintext || p?.confidential?.private_key || p?.confidential?.seed_phrase) errors.push('secret_in_public_manifest');
 if(p?.confidential && p.confidential.encryption!=='AES-256-GCM') errors.push('confidential_encryption_required');
 return {release_allowed:errors.length===0,errors,media_hash: p?.media?.sha256??null};
}
export function verifyMedia(bytes,expectedSha256){return isHex(expectedSha256)&&hash(bytes)===expectedSha256.toLowerCase()}
