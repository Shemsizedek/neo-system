import test from 'node:test'
import assert from 'node:assert/strict'
import {attestationCheck,buildProductionAttestation,assertGreenAttestation,ATTESTATION_SCHEMA} from './productionAttestation.mjs'

const ids=['EDGE_HTTPS','OPERATOR_HEALTH','PRIVATE_BACKEND_READY','ANONYMOUS_SESSION_BLOCKED','AUTHENTICATED_SESSION','SESSION_COOKIE_POLICY','CSRF_ENFORCED','RBAC_PROVEN','TREASURY_READ','HASHVAULT_READ','SESSION_LOGOUT']

test('attestation is GREEN only when every required proof is GREEN',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  assert.equal(att.schema,ATTESTATION_SCHEMA)
  assert.equal(att.state,'GREEN')
  assert.equal(att.summary.blocked,0)
  assert.equal(assertGreenAttestation(att),att)
})

test('missing or blocked proof fails closed',()=>{
  const att=buildProductionAttestation({checks:[attestationCheck('EDGE_HTTPS',true),attestationCheck('OPERATOR_HEALTH',false,{reason:'DOWN'})]})
  assert.equal(att.state,'BLOCKED')
  assert.ok(att.summary.blocked>=1)
  assert.throws(()=>assertGreenAttestation(att),/PRODUCTION_ATTESTATION_BLOCKED/)
})

test('evidence removes secret-like fields',()=>{
  const check=attestationCheck('EDGE_HTTPS',true,{hostname:'operator.example.org',token:'do-not-emit',cookie:'do-not-emit',status:200})
  assert.deepEqual(check.evidence,{hostname:'operator.example.org',status:200})
})
