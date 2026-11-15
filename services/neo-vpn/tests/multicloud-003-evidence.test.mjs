import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateEvidence, REQUIRED_PILOT, REQUIRED_INSTITUTIONAL}
  from '../federation/multicloud-003-evidence.mjs';

const NOW=Date.parse('2026-11-14T04:30:00Z');
const timestamp=offset=>new Date(NOW-offset*1000).toISOString();
const sample=()=>({
  schema:'neo.multicloud.003.operator-evidence.v1',
  source:'LOCAL_OPERATOR_ATTESTATION',
  observations:{
    android: timestamp(180), linux:timestamp(120),
    handshake:timestamp(100), private_request:timestamp(90),
  },
  results:Object.fromEntries([...REQUIRED_PILOT,...REQUIRED_INSTITUTIONAL]
    .map(k=>[k,'NOT_TESTED'])),
  private_key:'DO_NOT_ECHO', internal_ip:'100.64.2.55', username:'PRIVATE_USER'
});

test('no real evidence produces hold with no fabricated handshake',()=>{
  const r=evaluateEvidence(sample(),NOW);
  assert.equal(r.decision,'HOLD_PENDING_REAL_PEER_EVIDENCE');
  assert.equal(r.actual_wireguard_handshake_independently_verified,false);
  assert.equal(r.production_authorized,false);
  assert.equal(r.pilot_eligible_for_independent_review,false);
});

test('realistic personal two-device pilot may be considered for review only',()=>{
  const d=sample();
  for(const name of REQUIRED_PILOT)d.results[name]='PASS';
  const r=evaluateEvidence(d,NOW);
  assert.equal(r.decision,'PERSONAL_PILOT_REVIEW_ELIGIBLE_NOT_CERTIFIED');
  assert.equal(r.institutional_eligible_for_independent_review,false);
  assert.equal(r.live_neo_private_route_certified,false);
});

test('all PASS is still operator assertion, not production acceptance',()=>{
  const d=sample();
  for(const name of [...REQUIRED_PILOT,...REQUIRED_INSTITUTIONAL])d.results[name]='PASS';
  const r=evaluateEvidence(d,NOW);
  assert.equal(r.decision,'INSTITUTIONAL_REVIEW_ELIGIBLE_NOT_CERTIFIED');
  assert.equal(r.institutional_eligible_for_independent_review,true);
  assert.equal(r.actual_wireguard_handshake_independently_verified,false);
  assert.equal(r.production_authorized,false);
  assert.equal(r.failover_certified,false);
  for (const secret of ['DO_NOT_ECHO','100.64.2.55','PRIVATE_USER'])assert.ok(!JSON.stringify(r).includes(secret));
});

test('15-minute freshness bound is enforced on every observation',()=>{
  const d=sample();d.observations.linux=timestamp(1200);
  assert.equal(evaluateEvidence(d,NOW).decision,'HOLD_INVALID_OR_STALE_EVIDENCE');
  const e=sample();e.observations.private_request=timestamp(-180);
  assert.equal(evaluateEvidence(e,NOW).decision,'HOLD_INVALID_OR_STALE_EVIDENCE');
});

test('a handshake far removed from the request is not correlated',()=>{
  const d=sample();d.observations.handshake=timestamp(720);
  assert.equal(evaluateEvidence(d,NOW).flags[0],'HANDSHAKE_REQUEST_NOT_CORRELATED');
});

test('invalid or missing evidence fields fail closed',()=>{
  const d=sample();delete d.results.recent_wireguard_handshake_on_second_peer;
  assert.equal(evaluateEvidence(d,NOW).decision,'HOLD_INVALID_OR_STALE_EVIDENCE');
  const e=sample();e.results.device_a_authorized='SURE';
  assert.equal(evaluateEvidence(e,NOW).decision,'HOLD_INVALID_OR_STALE_EVIDENCE');
  assert.equal(evaluateEvidence({},NOW).decision,'HOLD_INVALID_OR_STALE_EVIDENCE');
});

test('one failed authorized device blocks a pilot regardless of other checks',()=>{
  const d=sample();for(const name of REQUIRED_PILOT)d.results[name]='PASS';
  d.results.device_b_authorized='FAIL';
  const r=evaluateEvidence(d,NOW);
  assert.equal(r.decision,'HOLD_PENDING_REAL_PEER_EVIDENCE');
  assert.ok(r.missing_pilot_evidence.includes('UNMET_DEVICE_B_AUTHORIZED'));
});

test('narrow policy omission prevents any pilot-ready decision',()=>{
  const d=sample();for(const name of REQUIRED_PILOT)d.results[name]='PASS';
  d.results.only_narrow_test_policy_allowed='NOT_TESTED';
  assert.equal(evaluateEvidence(d,NOW).pilot_eligible_for_independent_review,false);
});
