import test from 'node:test';
import assert from 'node:assert/strict';
import {rehearseNeoKeyStagingRelease,neoKeyStagingGateRequirements}
  from './staging-release-rehearsal.mjs';

test('Gate 9 rehearsal defaults to NO-GO with no operations or release authority',()=>{
  const r=rehearseNeoKeyStagingRelease();
  assert.equal(r.decision,'NO_GO');
  assert.equal(r.deploymentAuthorized,false);
  assert.deepEqual(r.actionsPerformed,[]);
  assert.equal(r.missing.length,10);
  assert.equal(r.mode,'dry-run-no-side-effects');
});

test('CI success and software fixtures cannot substitute for independent review or FIDO2',()=>{
  const evidence={
    recovery_rollback:{status:'verified',source:'CI mock PostgreSQL'},
    identity_boundary:{status:'verified',source:'CI synthetic issuer'}
  };
  const r=rehearseNeoKeyStagingRelease(evidence);
  assert.equal(r.decision,'NO_GO');
  assert.ok(r.missing.some(x=>x.key==='fido2_primary_backup'));
  assert.ok(r.missing.some(x=>x.key==='security_review'));
  assert.ok(r.missing.some(x=>x.key==='owner_change_approval'));
  assert.equal(r.deploymentAuthorized,false);
});

test('even a complete self-reported dossier cannot execute or authorize a release',()=>{
  const evidence=Object.fromEntries(neoKeyStagingGateRequirements.map(([k])=>[k,{status:'verified'}]));
  const r=rehearseNeoKeyStagingRelease(evidence);
  assert.equal(r.decision,'INDEPENDENT_RELEASE_REVIEW_REQUIRED');
  assert.deepEqual(r.missing,[]);
  assert.equal(r.deploymentAuthorized,false);
  assert.deepEqual(r.actionsPerformed,[]);
});

test('unreviewed, omitted and invalid evidence fails closed',()=>{
  assert.throws(()=>rehearseNeoKeyStagingRelease(null),/invalid_evidence/);
  assert.throws(()=>rehearseNeoKeyStagingRelease([]),/invalid_evidence/);
  assert.equal(rehearseNeoKeyStagingRelease({fido2_primary_backup:{status:'pending'}}).decision,'NO_GO');
  assert.equal(rehearseNeoKeyStagingRelease({security_review:true}).decision,'NO_GO');
});

test('Gate 10 observed state remains NO-GO despite passing synthetic CI',()=>{
  // An observed CI result is evidence only for software tests, not
  // hardware possession, issuer custody, independent review or deployment.
  const observed={
    recovery_rollback:{status:'verified',evidence:'isolated PostgreSQL test only'},
    security_review:{status:'pending'},
    fido2_primary_backup:{status:'blocked',reason:'both authorized hosts offline'},
    issuer_custody:{status:'unverified'},
    dual_approver_custody:{status:'unverified'},
    owner_change_approval:{status:'not-granted'}
  };
  const result=rehearseNeoKeyStagingRelease(observed);
  assert.equal(result.decision,'NO_GO');
  for(const key of ['issuer_custody','dual_approver_custody','security_review',
    'fido2_primary_backup','owner_change_approval']){
    assert.ok(result.missing.some(x=>x.key===key),key);
  }
  assert.equal(result.deploymentAuthorized,false);
  assert.deepEqual(result.actionsPerformed,[]);
});
