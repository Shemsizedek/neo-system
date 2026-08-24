import test from 'node:test'
import assert from 'node:assert/strict'
import {canonicalAgreement,calculateComposite} from './benchmarkAgreement.mjs'

test('agreement produces deterministic contract hash shape',()=>{
 const a=canonicalAgreement({agreementId:'SBA-BTC-001',version:'0.1',methodology:'weighted composite',governance:'multi-stakeholder proposal'})
 assert.equal(a.document.status,'PROPOSED')
 assert.equal(a.hash.length,64)
})

test('benchmark refuses publication when a component market is missing',()=>{
 const b=calculateComposite([{asset:'BTC',price:100000,quoteCurrency:'USD',source:'demo',observedAt:'2026-01-01T00:00:00Z'}])
 assert.equal(b.status,'UNAVAILABLE')
})
