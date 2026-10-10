import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNmniIdentity,validateVerifiedBinding,publicIdentityBinding} from './nmni-registry.mjs';
test('NMNI identifiers preserve padding',()=>{
 assert.equal(validateNmniIdentity('NMNI0000'),'NMNI0000');
 assert.equal(validateNmniIdentity('NMNI0002'),'NMNI0002');
 for(const bad of ['NMNI2','nmni0002','NMNI0002 ','CES-ABCDEFGHIJ'])assert.throws(()=>validateNmniIdentity(bad));
});
test('proof requirements bar unsupported identity claims',()=>{
 assert.throws(()=>validateVerifiedBinding({nmniAccountId:'NMNI0002',verificationStatus:'PENDING'}));
 assert.throws(()=>validateVerifiedBinding({nmniAccountId:'NMNI0002',verificationStatus:'VERIFIED',evidenceType:'SCREENSHOT'}));
 const x=validateVerifiedBinding({nmniAccountId:'NMNI0002',verificationStatus:'VERIFIED',evidenceType:'CES_APPROVED_API',evidenceDigest:'sha256:'+'a'.repeat(64)});
 assert.equal(publicIdentityBinding(x).externalCesBalanceVerified,false);
});
