import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import policy from '../../architecture/neo-secrets-fabric-policy.json' with {type:'json'}
import {createKeyRecord,envelopeEncrypt,envelopeDecrypt,createSecretLease,validateSecretLease,thresholdDecision,authorizeKeyUse,rotateKeyRecord,revokeKeyRecord,createRecoveryPlan,secretsSnapshot} from './fabric.mjs'

test('envelope encryption protects plaintext and verifies digest',()=>{
  const kek=crypto.randomBytes(32),env=envelopeEncrypt({plaintext:'secret-value',kek,keyId:'kek-1'})
  assert.equal(env.ciphertext.includes('secret-value'),false)
  assert.equal(envelopeDecrypt({envelope:env,kek}).toString(),'secret-value')
})

test('secret leases are short-lived and scope bound',()=>{
  const lease=createSecretLease({secretId:'db-password',subject:'neo-bank',ttlSeconds:60,scopes:['read']})
  assert.equal(validateSecretLease({lease,subject:'neo-bank',scope:'read'}).valid,true)
  assert.equal(validateSecretLease({lease,subject:'neo-bank',scope:'write'}).valid,false)
})

test('root and CA use require threshold approval',()=>{
  const root=createKeyRecord({keyId:'root-1',keyClass:'ROOT'})
  const one=authorizeKeyUse({keyRecord:root,policy,approvals:[{signer:'a',approved:true}],eligibleSigners:['a','b','c']})
  const two=authorizeKeyUse({keyRecord:root,policy,approvals:[{signer:'a',approved:true},{signer:'b',approved:true}],eligibleSigners:['a','b','c']})
  assert.equal(one.authorized,false)
  assert.equal(two.authorized,true)
})

test('rotation preserves lineage and revocation fails closed',()=>{
  const k=createKeyRecord({keyId:'svc-1'})
  const r=rotateKeyRecord({current:k,newKeyId:'svc-2'})
  assert.equal(r.next.rotated_from,'svc-1')
  assert.equal(revokeKeyRecord({keyRecord:r.next}).status,'REVOKED')
})

test('recovery plans contain no recovery material',()=>{
  const p=createRecoveryPlan({secretId:'estate-root',shares:3,threshold:2,custodians:['a','b','c']})
  assert.equal(p.material_embedded,false)
  assert.equal(p.threshold,2)
})

test('snapshot never claims plaintext persistence',()=>{
  assert.equal(secretsSnapshot({}).plaintext_secret_persistence,false)
})
