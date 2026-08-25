import test from 'node:test'
import assert from 'node:assert/strict'
import {assertNoSecrets,buildComposeUrl,normalizeComposition,validateSendIntent} from './composer.mjs'

test('rejects private key material',()=>{
  assert.throws(()=>assertNoSecrets({source:'x',privateKey:'do-not-store'}),/FORBIDDEN_SECRET_FIELD/)
})

test('validates and builds compose/send request',()=>{
  const input={source:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',destination:'1CounterpartyXXXXXXXXXXXXXXXUWLpVr',asset:'XCP',quantity:100000000}
  const {url,intent}=buildComposeUrl('https://counterparty.example',input)
  assert.equal(intent.asset,'XCP')
  assert.match(url,/\/v2\/addresses\//)
  assert.match(url,/compose\/send/)
  assert.match(url,/asset=XCP/)
})

test('normalizes unsigned transaction and preserves non-custodial boundary',()=>{
  const result=normalizeComposition({result:{rawtransaction:'0200000001deadbeef',btc_fee:1000}},{source:'a',destination:'b',asset:'XCP',quantity:1})
  assert.equal(result.unsignedTransaction,'0200000001deadbeef')
  assert.equal(result.signing.backendCanSign,false)
  assert.equal(result.broadcast.enabled,false)
})

test('rejects invalid quantity',()=>{
  assert.throws(()=>validateSendIntent({source:'1BoatSLRHtKNngkdXEeobR76b53LETtpyT',destination:'1CounterpartyXXXXXXXXXXXXXXXUWLpVr',asset:'XCP',quantity:0}),/INVALID_QUANTITY/)
})
