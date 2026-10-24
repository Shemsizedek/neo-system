import test from 'node:test'
import assert from 'node:assert/strict'
import {probeCareersDatabase,probeCounterpartyAsset} from './live-probes.mjs'
test('database missing fails closed',async()=>assert.equal((await probeCareersDatabase()).connected,false))
test('read only database ping reports connected',async()=>assert.equal((await probeCareersDatabase({query:async()=>({rows:[{probe:1}]})})).connected,true))
test('database error fails closed',async()=>assert.equal((await probeCareersDatabase({query:async()=>{throw Error('offline')}})).connected,false))
const req={asset:'NOMNI',expectedIssuer:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg'}
test('no Counterparty source fails closed',async()=>assert.equal((await probeCounterpartyAsset(req)).verified,false))
test('issuer mismatch blocks verification',async()=>assert.equal((await probeCounterpartyAsset({...req,fetchAsset:async()=>({asset:'NOMNI',issuer:'other',network:'mainnet',sourceAuthenticated:true})})).verified,false))
test('unauthenticated source blocks verification',async()=>assert.equal((await probeCounterpartyAsset({...req,fetchAsset:async()=>({asset:'NOMNI',issuer:req.expectedIssuer,network:'mainnet',sourceAuthenticated:false})})).verified,false))
test('authenticated source confirms only reported issuer, not payroll eligibility',async()=>{const r=await probeCounterpartyAsset({...req,fetchAsset:async()=>({asset:'NOMNI',issuer:req.expectedIssuer,network:'mainnet',sourceAuthenticated:true})});assert.equal(r.verified,true);assert.equal(r.payrollEligible,false);assert.equal(r.equityRightsVerified,false)})
