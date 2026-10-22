import {test} from 'node:test';import assert from 'node:assert/strict';
import {sha256,buildCommitment,verifyMetadataBytes} from './integrity.mjs';
test('Merkle membership verifies exact metadata bytes, rejects tampering and cross-asset substitution',()=>{
 const payloads={A:'{"asset":"A"}',B:'{"asset":"B"}',C:'{"asset":"C"}'};const tree=buildCommitment(Object.entries(payloads).map(([asset,b])=>({asset,hash:sha256(b)})));
 for(const e of tree.entries){const v={asset:e.asset,info_sha256:e.hash,merkle_root:tree.root,merkle_proof:e.proof};assert.equal(verifyMetadataBytes(e.asset,payloads[e.asset],v),true);assert.equal(verifyMetadataBytes(e.asset,payloads[e.asset]+' ',v),false);assert.equal(verifyMetadataBytes('WRONG',payloads[e.asset],v),false);}
 assert.equal(buildCommitment([...tree.entries].reverse()).root,tree.root);assert.throws(()=>buildCommitment([]));assert.throws(()=>buildCommitment([{asset:'A',hash:sha256('a')},{asset:'A',hash:sha256('b')}]));
});
