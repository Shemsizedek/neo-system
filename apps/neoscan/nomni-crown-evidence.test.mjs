import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {oracleEvidenceReceipt} from '../../server/neo-prime/evidence.mjs';
import {verifyCrownAttestation,buildCrownEvidenceEnvelope} from './nomni-crown-evidence.mjs';
test('signed Crown receipt verifies signature but not reserves, title or market value',()=>{
 const keys=generateKeyPairSync('ed25519');
 const receipt=oracleEvidenceReceipt({source:'crown-chain',network:'mainnet',txid:'a'.repeat(64),blockHash:'b'.repeat(64),confirmations:2,observedAt:new Date().toISOString(),asset:'NOMNI'});
 const record_digest=createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
 const signature=sign(null,Buffer.from(record_digest),keys.privateKey).toString('base64');
 const a={key_id:'fixture',record_digest,signature,receipt,reserve_evidence_hash:'c'.repeat(64)};
 const verified=verifyCrownAttestation(a,{trustedKeys:{fixture:keys.publicKey.export({format:'pem',type:'spki'})},nodeVerified:true});
 assert.equal(verified.signature_verified,true);assert.equal(verified.onchain_evidence_publishable,true);
 assert.equal(verified.reserve_backing_verified,false);
 assert.equal(buildCrownEvidenceEnvelope({attestation:a,verification:verified}).index_level,null);
 assert.equal(verifyCrownAttestation({...a,record_digest:'d'.repeat(64)},{trustedKeys:{fixture:keys.publicKey.export({format:'pem',type:'spki'})}}).status,'tampered');
});
test('unknown signer fails closed',()=>assert.equal(verifyCrownAttestation({key_id:'untrusted'},{trustedKeys:{}}).publishable,false));
