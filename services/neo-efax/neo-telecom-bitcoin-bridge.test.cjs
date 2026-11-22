'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {prepareEncryptedFaxIntent,prepareBitcoinBatch,assessMeshDryRun,createDisabledExternalOperations}=require('./neo-telecom-bitcoin-bridge.cjs');
const request=()=>({tenantId:'neo',requestId:crypto.randomUUID(),encryptedObjectRef:'opaque_cipher_object_12345678',
 ciphertextSha256:crypto.createHash('sha256').update('ciphertext fixture').digest('hex'),sourceNodeId:'NEO-HOU-001',
 destinationNodeId:'NEO-ATL-002',ttlSeconds:3600});
function prepare(){return prepareEncryptedFaxIntent(request());}
test('draft intent exposes no plaintext, carrier number or transmission authority',()=>{
 const intent=prepare();const output=JSON.stringify(intent);
 assert.equal(intent.nvsnIntent.protocol,'NVSN/1.1');
 assert.equal(intent.nvsnIntent.dispatchable,false);
 assert.equal(intent.bitcoinProposal.status,'NOT_BROADCAST');
 assert.equal(intent.bitcoinProposal.txid,null);
 assert.equal(intent.bitcoinProposal.broadcastEnabled,false);
 assert.ok(!output.includes('faxNumber'));
 assert.ok(!output.includes('documentContents'));
});
test('identical encrypted digest with independent randomness yields unrelated commitments',()=>{
 const input=request();
 const a=prepareEncryptedFaxIntent(input),b=prepareEncryptedFaxIntent(input);
 assert.notEqual(a.bitcoinProposal.commitmentLeaf,b.bitcoinProposal.commitmentLeaf);
 assert.notEqual(a.privateManifest.commitmentSaltHex,b.privateManifest.commitmentSaltHex);
});
test('manifest rejects plaintext, phone numbers and unknown metadata fields',()=>{
 for(const key of ['plaintext','faxNumber','recipientEmail','documentContents','patientName']){
  assert.throws(()=>prepareEncryptedFaxIntent({...request(),[key]:'PRIVATE'}),/unexpected_field_not_allowed/);
 }
});
test('requires opaque encrypted reference, digest, valid IDs and bounded TTL',()=>{
 assert.throws(()=>prepareEncryptedFaxIntent({...request(),encryptedObjectRef:'https://public.example/doc.pdf'}),/invalid_encrypted_reference/);
 assert.throws(()=>prepareEncryptedFaxIntent({...request(),ciphertextSha256:'123'}),/invalid_ciphertext_digest/);
 assert.throws(()=>prepareEncryptedFaxIntent({...request(),sourceNodeId:'NEO-HOU-001',destinationNodeId:'NEO-HOU-001'}),/same_source_and_destination/);
 assert.throws(()=>prepareEncryptedFaxIntent({...request(),ttlSeconds:0}),/invalid_ttl/);
});
test('salt must come from secure 32-byte random source',()=>{
 assert.throws(()=>prepareEncryptedFaxIntent(request(),{randomBytes:()=>Buffer.alloc(1)}),/secure_random_required/);
});
test('expiry is explicit and stale mesh intents fail closed',()=>{
 const current=new Date('2026-11-21T12:00:00Z');
 const i=prepareEncryptedFaxIntent(request(),{clock:()=>current});
 const state=assessMeshDryRun(i,{},()=>new Date('2026-11-21T14:00:00Z'));
 assert.equal(state.state,'BLOCKED');
 assert.ok(state.missing.includes('ttl_expired'));
});
test('missing identity, signed route, ACL, real peer and durable queue block mesh',()=>{
 const x=assessMeshDryRun(prepare());
 assert.equal(x.state,'BLOCKED');
 for(const key of ['trustedNeopassActor','recipientKeyValidated','encryptedObjectVerified','nvsnSignatureVerified',
 'routeAclVerified','independentMeshPeerReachable','durableQueueAndAckVerified'])assert.ok(x.missing.includes(key));
 assert.equal(x.canSend,false);
});
test('all evidence only permits dry-run review, never sending',()=>{
 const evidence={trustedNeopassActor:true,recipientKeyValidated:true,encryptedObjectVerified:true,nvsnSignatureVerified:true,
 routeAclVerified:true,independentMeshPeerReachable:true,durableQueueAndAckVerified:true};
 const x=assessMeshDryRun(prepare(),evidence);
 assert.equal(x.state,'ELIGIBLE_FOR_REVIEWED_DRY_RUN');
 assert.equal(x.canSend,false);assert.equal(x.canBroadcast,false);
});
test('batch commitments deterministic, duplicate leaves rejected and never broadcast',()=>{
 const a=prepare(),b=prepare();
 const x=prepareBitcoinBatch([a,b]),y=prepareBitcoinBatch([b,a]);
 assert.equal(x.merkleRootSha256,y.merkleRootSha256);
 assert.equal(x.state,'PROPOSAL_ONLY_NOT_ANCHORED');
 assert.equal(x.txid,null);assert.equal(x.broadcastEnabled,false);
 assert.throws(()=>prepareBitcoinBatch([a,a]),/duplicate_commitment_leaf/);
});
test('all external actions reject without network calls',async()=>{
 const ops=createDisabledExternalOperations();
 await assert.rejects(ops.transmitFax({}),/fax_transport_disabled/);
 await assert.rejects(ops.dispatchNvsn({}),/nvsn_dispatch_disabled/);
 await assert.rejects(ops.broadcastBitcoin({}),/bitcoin_broadcast_disabled/);
});
