#!/usr/bin/env node
// NOMNI-CRYPTO-030: fail-closed artwork and issuer-evidence verifier.
// Usage: node verify-nomni-bill.mjs <original-image.jpg> <issuer-evidence.json>
// The evidence JSON must have: asset, artwork_sha256, issuer_address,
// signature, signed_message, signature_verified, issuer_address_verified,
// onchain_description_verified and onchain_txid.
// Signature and issuer ownership MUST be verified by an independent trusted
// Bitcoin/Counterparty verifier; these flags are never accepted as cryptographic proof.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const expected='bf9b0e221d5e4f788de1c3ec1080c171e030000f867fcfd9dd18bbac86d72984';
const message=`NEO-NOMNI-BILL-v1\nnetwork=bitcoin-mainnet\nprotocol=Counterparty\nasset=NOMNI\ndenomination=1 NOMNI\nartwork_sha256=${expected}\n`;
function main(){
 const [imagePath,evidencePath]=process.argv.slice(2);
 if(!imagePath){console.error('Usage: node verify-nomni-bill.mjs <original-image> [evidence.json]');process.exit(2)}
 const digest=createHash('sha256').update(readFileSync(imagePath)).digest('hex');
 const artworkValid=digest===expected;
 const evidence=evidencePath?JSON.parse(readFileSync(evidencePath,'utf8')):null;
 const referenceMatches=Boolean(evidence && evidence.asset==='NOMNI' && evidence.artwork_sha256===expected && evidence.signed_message===message && /^[0-9a-fA-F]{64}$/.test(evidence.onchain_txid??''));
 const externallyVerified=Boolean(referenceMatches && evidence.signature && evidence.issuer_address && evidence.signature_verified===true && evidence.issuer_address_verified===true && evidence.onchain_description_verified===true);
 console.log(JSON.stringify({asset:'NOMNI',artwork_sha256:digest,artwork_valid:artworkValid,evidence_reference_matches:referenceMatches,external_verification_claimed:externallyVerified,signature_cryptographically_checked_by_this_script:false,release_ready:false},null,2));
 // Never conflate third-party boolean claims with local cryptographic verification.
 process.exit(artworkValid?0:1);
}
try{main()}catch(e){console.error(e.message);process.exit(2)}
