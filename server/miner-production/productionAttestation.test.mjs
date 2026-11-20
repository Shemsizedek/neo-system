import test from 'node:test'
import assert from 'node:assert/strict'
import {attestationCheck,buildProductionAttestation,assertGreenAttestation,ATTESTATION_SCHEMA} from './productionAttestation.mjs'

const ids=['EDGE_HTTPS','OPERATOR_HEALTH','PRIVATE_BACKEND_READY','ANONYMOUS_SESSION_BLOCKED','AUTHENTICATED_SESSION','SESSION_COOKIE_POLICY','CSRF_ENFORCED','RBAC_PROVEN','TREASURY_READ','HASHVAULT_READ','SESSION_LOGOUT']

test('attestation is GREEN only when every required proof is GREEN',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  assert.equal(att.schema,ATTESTATION_SCHEMA)
  assert.equal(att.state,'GREEN')
  assert.equal(att.summary.blocked,0)
  assert.equal(assertGreenAttestation(att,{now:Date.parse('2026-08-29T14:01:00.000Z')}),att)
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

test('minimal forged attestation is rejected',()=>{
  const forged={schema:ATTESTATION_SCHEMA,state:'GREEN'}
  assert.throws(()=>assertGreenAttestation(forged),/ATTESTATION_GENERATED_AT_REQUIRED/)
})

test('attestation without operator is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  delete att.operator
  assert.throws(()=>assertGreenAttestation(att,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_OPERATOR_REQUIRED/)
})

test('attestation without source is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  delete att.source
  assert.throws(()=>assertGreenAttestation(att,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_SOURCE_REQUIRED/)
})

test('attestation without checks is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  att.checks=[]
  assert.throws(()=>assertGreenAttestation(att,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_CHECKS_INCOMPLETE/)
})

test('attestation with missing required check is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  att.checks=att.checks.filter(c=>c.id!=='CSRF_ENFORCED')
  // Add a dummy check to maintain the count so we get past the length check
  att.checks.push(attestationCheck('DUMMY_CHECK',true))
  assert.throws(()=>assertGreenAttestation(att,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_REQUIRED_CHECK_MISSING_CSRF_ENFORCED/)
})

test('stale attestation is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  assert.throws(()=>assertGreenAttestation(att,{maxAgeMs:60_000,now:Date.parse('2026-08-29T14:02:00.000Z')}),/ATTESTATION_STALE_OR_FUTURE/)
})

test('future attestation is rejected',()=>{
  const att=buildProductionAttestation({checks:ids.map(id=>attestationCheck(id,true)),operatorId:'ops-1',operatorRole:'ADMIN',generatedAt:'2026-08-29T14:00:00.000Z'})
  assert.throws(()=>assertGreenAttestation(att,{now:Date.parse('2026-08-29T13:59:00.000Z')}),/ATTESTATION_STALE_OR_FUTURE/)
})

test('pentest exploit: minimal forged attestation with only schema and state is rejected',()=>{
  // This is the exact exploit from the pentest: {schema: ATTESTATION_SCHEMA, state: 'GREEN'}
  const forgedMinimal={schema:ATTESTATION_SCHEMA,state:'GREEN'}
  assert.throws(()=>assertGreenAttestation(forgedMinimal),/ATTESTATION_GENERATED_AT_REQUIRED/)
})

test('pentest exploit: forged attestation with fake summary but no checks is rejected',()=>{
  // Attacker tries to add summary to bypass validation
  const forgedWithSummary={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:0}
  }
  assert.throws(()=>assertGreenAttestation(forgedWithSummary,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_CHECKS_INCOMPLETE/)
})

test('pentest exploit: forged attestation with incomplete checks is rejected',()=>{
  // Attacker provides some checks but not all required ones
  const forgedIncomplete={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:0},
    checks:[
      attestationCheck('EDGE_HTTPS',true),
      attestationCheck('OPERATOR_HEALTH',true)
      // Missing 9 other required checks
    ]
  }
  assert.throws(()=>assertGreenAttestation(forgedIncomplete,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_CHECKS_INCOMPLETE/)
})

test('pentest exploit: forged attestation with all checks but one is not GREEN is rejected',()=>{
  // Attacker provides all checks but one is BLOCKED
  const checksWithOneBlocked=ids.map(id=>attestationCheck(id,id!=='CSRF_ENFORCED'))
  const forgedWithBlockedCheck={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN', // Attacker lies about state
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:0}, // Attacker lies about summary
    checks:checksWithOneBlocked
  }
  assert.throws(()=>assertGreenAttestation(forgedWithBlockedCheck,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_REQUIRED_CHECK_NOT_GREEN_CSRF_ENFORCED/)
})

test('pentest exploit: replay attack with old GREEN attestation is rejected',()=>{
  // Attacker reuses a legitimate but old attestation
  const oldAttestation=buildProductionAttestation({
    checks:ids.map(id=>attestationCheck(id,true)),
    operatorId:'ops-1',
    operatorRole:'ADMIN',
    generatedAt:'2026-08-29T12:00:00.000Z' // 2 hours old
  })
  // Default maxAgeMs is 30 minutes
  assert.throws(()=>assertGreenAttestation(oldAttestation,{now:Date.parse('2026-08-29T14:00:00.000Z')}),/ATTESTATION_STALE_OR_FUTURE/)
})

test('pentest exploit: forged attestation with check marked as not required is rejected',()=>{
  // Attacker tries to bypass by marking required checks as not required
  const checksNotRequired=ids.map(id=>({...attestationCheck(id,true),required:false}))
  const forgedNotRequired={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:0},
    checks:checksNotRequired
  }
  assert.throws(()=>assertGreenAttestation(forgedNotRequired,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_REQUIRED_CHECK_NOT_MARKED_REQUIRED/)
})

test('pentest exploit: forged attestation with mismatched summary counts is rejected',()=>{
  // Attacker provides all checks but lies about summary counts
  const forgedMismatchedSummary={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:5,green:5,blocked:0}, // Lies about counts
    checks:ids.map(id=>attestationCheck(id,true))
  }
  assert.throws(()=>assertGreenAttestation(forgedMismatchedSummary,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_SUMMARY_REQUIRED_INVALID/)
})

test('pentest exploit: forged attestation with non-zero blocked count is rejected',()=>{
  // Attacker claims GREEN state but summary shows blocked checks
  const forgedWithBlockedCount={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:1}, // Inconsistent
    checks:ids.map(id=>attestationCheck(id,true))
  }
  assert.throws(()=>assertGreenAttestation(forgedWithBlockedCount,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_SUMMARY_BLOCKED_MUST_BE_ZERO/)
})

test('pentest exploit: forged attestation without operator role is rejected',()=>{
  // Attacker provides operator object but without role
  const forgedNoRole={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'2026-08-29T14:00:00.000Z',
    source:'FORGED',
    operator:{id:'attacker'}, // Missing role
    summary:{required:11,green:11,blocked:0},
    checks:ids.map(id=>attestationCheck(id,true))
  }
  assert.throws(()=>assertGreenAttestation(forgedNoRole,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_OPERATOR_ROLE_REQUIRED/)
})

test('pentest exploit: forged attestation with invalid generatedAt is rejected',()=>{
  // Attacker provides invalid timestamp
  const forgedInvalidTime={
    schema:ATTESTATION_SCHEMA,
    state:'GREEN',
    generatedAt:'not-a-valid-date',
    source:'FORGED',
    operator:{id:'attacker',role:'FAKE'},
    summary:{required:11,green:11,blocked:0},
    checks:ids.map(id=>attestationCheck(id,true))
  }
  assert.throws(()=>assertGreenAttestation(forgedInvalidTime,{now:Date.parse('2026-08-29T14:01:00.000Z')}),/ATTESTATION_GENERATED_AT_INVALID/)
})

