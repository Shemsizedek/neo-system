import assert from 'node:assert/strict';
import test from 'node:test';
import {createVerifiedProofGate} from './verified-proof-gate.mjs';

test('proof cannot be forged, consumed twice or used across accounts',()=>{
 const {issuer,consumer}=createVerifiedProofGate();
 const args={subject:'member-1',credentialId:'key-1',publicKey:'x'.repeat(64)};
 assert.throws(()=>consumer.consume({...args},'member-1'),/verified_proof_required/);
 const proof=issuer.issue(args);
 assert.throws(()=>consumer.consume(proof,'member-2'),/verified_proof_required/);
 assert.deepEqual(consumer.consume(proof,'member-1'),{credentialId:'key-1',publicKey:args.publicKey});
 assert.throws(()=>consumer.consume(proof,'member-1'),/verified_proof_required/);
});
test('proof capability is confined to a single gate instance',()=>{
 const a=createVerifiedProofGate(),b=createVerifiedProofGate();
 const proof=a.issuer.issue({subject:'s',credentialId:'c',publicKey:'a'.repeat(64)});
 assert.throws(()=>b.consumer.consume(proof,'s'),/verified_proof_required/);
});
