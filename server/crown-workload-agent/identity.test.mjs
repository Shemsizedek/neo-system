import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,verify} from 'node:crypto'
import {workloadIdentity,signCrownInput} from './identity.mjs'

test('generic Crown agent exposes only public workload identity',()=>{
  const {privateKey,publicKey}=generateKeyPairSync('ed25519')
  const pem=privateKey.export({format:'pem',type:'pkcs8'}).toString()
  const id=workloadIdentity(pem,'crown:btc:app:neo-pay','neo-pay-prod-1')
  assert.equal(id.private_key_exposed,false)
  assert.equal(id.algorithm,'Ed25519')
  const msg=Buffer.from('crown-031-proof')
  const sig=Buffer.from(signCrownInput(pem,msg.toString('base64url')),'base64url')
  assert.equal(verify(null,msg,publicKey,sig),true)
})
