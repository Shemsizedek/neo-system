import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {oracleEvidenceReceipt} from '../../server/neo-prime/evidence.mjs';
import {createCrownEvidenceRegistry} from './nomni-crown-registry.mjs';
test('deduplicates Crown Chain evidence and never infers backing',()=>{
 const keys=generateKeyPairSync('ed25519');
 const receipt=oracleEvidenceReceipt({source:'crown-chain',network:'mainnet',txid:'a'.repeat(64),blockHash:'b'.repeat(64),confirmations:3,observedAt:new Date().toISOString(),asset:'NOMNI'});
 const record_digest=createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
 const attestation={key_id:'test',receipt,record_digest,signature:sign(null,Buffer.from(record_digest),keys.privateKey).toString('base64')};
 const reg=createCrownEvidenceRegistry({trustedKeys:{test:keys.publicKey.export({format:'pem',type:'spki'})},nodeVerified:true});
 assert.equal(reg.register({attestation}).inserted,true);
 assert.equal(reg.register({attestation}).inserted,false);
 assert.equal(reg.list().length,1);
 assert.equal(reg.marketSummary().status,'blockchain-evidence-available');
 assert.equal(reg.marketSummary().verified_market_price,null);
 assert.equal(reg.marketSummary().verified_reserve_value,null);
 assert.equal(reg.list()[0].public_labels.legal_ownership,'Not independently verified');
});
