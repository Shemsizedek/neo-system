import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSyntheticBondBatch,assessTeaResponseReadiness} from './bond-transparency-pilot.mjs';
const source={url:'https://example.org/fixture',observedAt:'2026-11-08T19:00:00Z',evidenceClass:'synthetic-fixture'};
const first={leaCode:'EXAMPLE-001',fiscalYear:2025,instrumentType:'general-obligation',amountCents:'123456789',source};
test('synthetic pilot counts exact integer cents without implied official bonds',()=>{
 const x=validateSyntheticBondBatch([first]); assert.equal(x.totalSyntheticAmountCents,'123456789');assert.equal(x.records[0].evidenceDigest.length,64);assert.equal(x.officialSchema,false);assert.equal(x.agencyAuthorization,false);
});
test('large values remain precise strings',()=>{
 const x=validateSyntheticBondBatch([{...first,amountCents:'99999999999999999999'}]); assert.equal(x.totalSyntheticAmountCents,'99999999999999999999');
});
test('duplicate source keys fail closed rather than double count',()=>assert.throws(()=>validateSyntheticBondBatch([first,first]),/Duplicate/));
test('any untrusted extra or sensitive field is rejected',()=>assert.throws(()=>validateSyntheticBondBatch([{...first,privateKey:'secret'}]),/unsupported\/sensitive/));
test('real or operator-asserted financials rejected from synthetic-only demo',()=>assert.throws(()=>validateSyntheticBondBatch([{...first,source:{...source,evidenceClass:'third-party'}}]),/synthetic/));
test('bad URL, year, decimal amounts and empty batches are rejected',()=>{
 assert.throws(()=>validateSyntheticBondBatch([]));
 assert.throws(()=>validateSyntheticBondBatch([{...first,source:{...source,url:'http://example.org'}}]));
 assert.throws(()=>validateSyntheticBondBatch([{...first,fiscalYear:2030}]));
 assert.throws(()=>validateSyntheticBondBatch([{...first,amountCents:'123.45'}]));
});
test('prime bid readiness exposes missing insurance, state security and staffing',()=>{
 const x=assessTeaResponseReadiness({route:'prime'}); assert.equal(x.governmentAwarded,false);assert.ok(x.missing.includes('insuranceTechCyber'));assert.ok(x.missing.includes('txRampPlan'));assert.ok(x.missing.includes('deliveryStaff'));assert.equal(x.proposalEligible,false);
});
test('subcontract is separate with prime flowdown and security evidence',()=>{
 const x=assessTeaResponseReadiness({route:'subcontract'}); assert.ok(x.missing.includes('primePartner'));assert.ok(x.missing.includes('primeFlowdown'));assert.ok(x.missing.includes('insuranceFlowdown'));
});
test('even complete claimed evidence refs require independent approval',()=>{
 const x0=assessTeaResponseReadiness({route:'subcontract'});
 const evidence=Object.fromEntries(x0.missing.map(k=>[k,{url:'https://example.org/review',reviewedBy:'Reviewer',receivedAt:'2026-11-08T19:00:00Z'}]));
 const x=assessTeaResponseReadiness({route:'subcontract',evidence});assert.deepEqual(x.missing,[]);assert.equal(x.proposalEligible,false);assert.equal(x.governmentAwarded,false);
});