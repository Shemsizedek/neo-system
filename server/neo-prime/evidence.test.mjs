import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeOracleEvidence, oracleEvidenceReceipt, classifyOracleEvidence } from './evidence.mjs'
const valid = () => ({source:'neo-scan',network:'signet',txid:'a'.repeat(64),blockHash:'b'.repeat(64),confirmations:3,observedAt:new Date().toISOString(),asset:'NOMNI'})
test('receipt is deterministic and defaults to unverified',()=>{ const x=oracleEvidenceReceipt(valid()); assert.equal(x.sha256,oracleEvidenceReceipt(validWithTime(x.record.observedAt)).sha256);assert.equal(x.settlementEnabled,false);assert.equal(x.verification,'source-reported-unverified') })
function validWithTime(time){return {...valid(),observedAt:time}}
test('unsupported sources and arbitrary assets are rejected',()=>{assert.throws(()=>normalizeOracleEvidence({...valid(),source:'external-url'}));assert.throws(()=>normalizeOracleEvidence({...valid(),asset:'<script>'}))})
test('missing Bitcoin proof metadata is rejected',()=>{assert.throws(()=>normalizeOracleEvidence({...valid(),blockHash:null}))})
test('normal source response cannot assert verification',()=>{assert.equal(classifyOracleEvidence(oracleEvidenceReceipt(valid())).publishable,false)})
test('node verification requires confirmations',()=>{assert.equal(classifyOracleEvidence(oracleEvidenceReceipt({...valid(),confirmations:0}),{nodeVerified:true}).status,'unconfirmed')})
test('tampering is detected',()=>{const r=oracleEvidenceReceipt(valid());assert.equal(classifyOracleEvidence({...r,sha256:'0'.repeat(64)},{nodeVerified:true}).status,'tampered')})
test('stale evidence is blocked',()=>{const r=oracleEvidenceReceipt({...valid(),observedAt:'2020-01-01T00:00:00Z'});assert.equal(classifyOracleEvidence(r,{nodeVerified:true}).status,'stale')})
test('node-verified fresh confirmed evidence may be published as evidence only',()=>{assert.equal(classifyOracleEvidence(oracleEvidenceReceipt(valid()),{nodeVerified:true}).status,'node-verified')})
