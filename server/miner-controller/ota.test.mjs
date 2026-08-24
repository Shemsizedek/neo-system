import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {validateManifest,verifyManifest} from './ota.mjs'

test('OTA manifest requires https and sha256',()=>{
  assert.equal(validateManifest({version:'0.8.0',artifactUrl:'http://bad',sha256:'x'},'0.7.0').ok,false)
  assert.equal(validateManifest({version:'0.8.0',artifactUrl:'https://updates.example/controller.tar.gz',sha256:'a'.repeat(64)},'0.7.0').ok,true)
})

test('OTA manifest verifies Ed25519 signature',()=>{
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ed25519')
  const manifest={version:'0.8.0',artifactUrl:'https://updates.example/controller.tar.gz',sha256:'b'.repeat(64)}
  const payload=JSON.stringify(manifest)
  const signature=crypto.sign(null,Buffer.from(payload),privateKey).toString('base64')
  const publicPem=publicKey.export({type:'spki',format:'pem'})
  assert.equal(verifyManifest(manifest,signature,publicPem),true)
})
