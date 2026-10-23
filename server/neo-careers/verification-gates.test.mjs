import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyWalletChallenge,verifyRegistryObservation} from './verification-gates.mjs'
const obs={asset:'NOMNI',issuerReference:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg',network:'bitcoin-counterparty',txid:'a'.repeat(64),source:'neo-scan'}
test('source claim never directly enables payroll',()=>assert.equal(verifyRegistryObservation({...obs,independentlyChecked:true}).payrollEligible,false))
test('bad txid rejected',()=>assert.throws(()=>verifyRegistryObservation({...obs,txid:'x'})))
test('wrong network rejected',()=>assert.throws(()=>verifyRegistryObservation({...obs,network:'ethereum'})))
test('wallet check requires trusted verifier',async()=>{await assert.rejects(verifyWalletChallenge({address:obs.issuerReference,challenge:'NEO-Careers:123456789012345678901234',signature:'signature'}))})
test('wallet ownership is not person identity',async()=>{const x=await verifyWalletChallenge({address:obs.issuerReference,challenge:'NEO-Careers:123456789012345678901234',signature:'signature',verifySignature:async()=>true});assert.equal(x.verified,true);assert.equal(x.identityVerified,false);assert.equal(x.payrollAuthorized,false)})
