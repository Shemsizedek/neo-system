import test from 'node:test';import assert from 'node:assert/strict';
import {checkIssuancePackage,verifyMedia} from './issuance-gate.mjs';
test('reject unsigned or unsupported issuance',()=>{const r=checkIssuancePackage({schema:'NEO-CROWN-ISSUANCE-V1',asset:'NOMNI',chain:'bitcoin-mainnet',protocol:'counterparty'});assert.equal(r.release_allowed,false);assert.ok(r.errors.includes('attestation'));});
test('media hashes fail closed',()=>{assert.equal(verifyMedia(Buffer.from('bill'),'0'.repeat(64)),false);});
test('reject plaintext and missing independent ledger checker',()=>{const r=checkIssuancePackage({confidential:{plaintext:'secret'}});assert.ok(r.errors.includes('secret_in_public_manifest'));assert.ok(r.errors.includes('independent_ledger_verifier_required'));});
