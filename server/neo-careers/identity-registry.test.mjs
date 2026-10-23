import test from 'node:test'
import assert from 'node:assert/strict'
import {createCareersDirectory,ISSUER_REFERENCES,auditDigest} from './identity-registry.mjs'
test('contributor enrollment stays unverified',()=>{const d=createCareersDirectory();const x=d.enroll({id:'worker1',role:'contributor',displayName:'Worker One'});assert.equal(x.walletOwnership,'unverified');assert.equal(x.authentication,'not-linked')})
test('employer cannot bypass identity checks',()=>{const d=createCareersDirectory();const x=d.enroll({id:'company1',role:'employer',displayName:'Company'});assert.equal(x.employmentVerification,'pending')})
test('duplicate identity blocked',()=>{const d=createCareersDirectory();const a={id:'worker1',role:'contributor',displayName:'Worker'};d.enroll(a);assert.throws(()=>d.enroll(a),/duplicate/)})
test('role rejection',()=>assert.throws(()=>createCareersDirectory().enroll({id:'x',role:'admin',displayName:'X'})))
test('currency candidate does not authorize payroll',()=>{const d=createCareersDirectory();const a=d.registerAssetCandidate({asset:'NOMNI',kind:'currency',issuerAddress:ISSUER_REFERENCES.currencies});assert.equal(a.payrollEligible,false);assert.equal(a.issuance,'unverified')})
test('equity candidate does not authorize distributions',()=>{const d=createCareersDirectory();const a=d.registerAssetCandidate({asset:'STANSHARES',kind:'equity',issuerAddress:ISSUER_REFERENCES.shares});assert.equal(a.distributionEligible,false)})
test('wrong issuer is rejected',()=>assert.throws(()=>createCareersDirectory().registerAssetCandidate({asset:'NOMNI',kind:'currency',issuerAddress:ISSUER_REFERENCES.shares})))
test('no signing or settlement capabilities',()=>assert.equal(createCareersDirectory().capabilities().payrollEnabled,false))
test('audit digest is deterministic',()=>assert.equal(auditDigest({id:'t'}),auditDigest({id:'t'})))
