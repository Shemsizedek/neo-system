import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeoMaskEntitlementDraft} from './neomask-entitlement.mjs';
const key=Buffer.alloc(32,7);
const args={key,memberInternalId:'member-1',deviceInternalId:'device-1',walletOwnershipVerified:true,guardianApproved:true};
test('draft uses keyed privacy-preserving commitments only',()=>{
 const r=createNeoMaskEntitlementDraft(args);
 assert.equal(r.status,'OFFCHAIN_DRAFT');assert.equal(r.txid,null);
 assert.equal(r.blockchainPublished,false);assert.equal(r.carrierProfileIssued,false);
 assert.equal(JSON.stringify(r).includes('member-1'),false);
});
test('cannot create entitlement without wallet and guardian consent',()=>{
 assert.throws(()=>createNeoMaskEntitlementDraft({...args,guardianApproved:false}),/wallet_and_guardian_approval_required/);
 assert.throws(()=>createNeoMaskEntitlementDraft({...args,key:Buffer.alloc(10)}),/secure_commitment_key_required/);
});
