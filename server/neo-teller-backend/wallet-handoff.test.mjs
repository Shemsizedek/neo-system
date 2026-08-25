import test from 'node:test'
import assert from 'node:assert/strict'
import {acceptSignedTransaction,buildSigningHandoff,listWalletAdapters} from './wallet-handoff.mjs'

test('lists supported non-custodial adapters',()=>{assert.ok(listWalletAdapters().some(a=>a.id==='NEOPAY'))})
test('builds user-device signing handoff',()=>{const h=buildSigningHandoff({intentId:'intent-1',adapter:'NEOPAY',unsignedTransaction:'0200000001deadbeefcafebabefeedface'});assert.equal(h.signingLocation,'USER_DEVICE');assert.equal(h.privateKeyTransfer,false)})
test('accepts signed transaction without enabling automatic broadcast',()=>{const r=acceptSignedTransaction({intentId:'intent-1',adapter:'EXTERNAL',signedTransaction:'0200000001deadbeefcafebabefeedface'});assert.equal(r.status,'READY_FOR_EXPLICIT_BROADCAST');assert.equal(r.broadcast.automatic,false);assert.equal(r.broadcast.enabled,false)})
test('rejects secret-bearing handoff',()=>{assert.throws(()=>buildSigningHandoff({intentId:'x',unsignedTransaction:'0200000001deadbeefcafebabefeedface',privateKey:'nope'}),/FORBIDDEN_SECRET_FIELD/)})
