import test from 'node:test';
import assert from 'node:assert/strict';
import { preflight } from '../diagnostics/connect-002-preflight.mjs';
import { REQUIREMENTS, evaluateLocalEvidence } from '../federation/connect-002-acceptance.mjs';

const NOW = Date.parse('2026-11-13T23:00:00Z');
const sample = () => ({
  source: 'LOCAL_OPERATOR_SELF_REPORT',
  observed_at: '2026-11-13T22:58:00Z',
  checks: Object.fromEntries(REQUIREMENTS.map(k => [k, 'PASS'])),
  secret: 'SHOULD_NEVER_APPEAR',
});

test('preflight makes only three bounded read-only health calls', () => {
  const called = [];
  const result = preflight({
    run: (cmd, args, options) => { called.push({cmd,args,options}); return {status:0}; },
    now: () => '2026-11-13T22:00:00Z',
  });
  assert.deepEqual(called.map(x => x.args), [
    ['status','--check','live'],['status','--check','ready'],['status','--check','startup']
  ]);
  assert.ok(called.every(x => x.cmd === 'netbird' && x.options.shell === false));
  assert.equal(result.daemon_checks.startup, 'PASS');
  assert.equal(result.encrypted_peer_handshake_verified, false);
  assert.equal(result.production_authorized, false);
});

test('unavailable CLI does not imply any online peer', () => {
  const report = preflight({run:()=>({error:{code:'ENOENT'}})});
  assert.equal(report.client_installed,false);
  assert.equal(report.daemon_checks.ready,'NOT_TESTED');
  assert.equal(report.encrypted_peer_handshake_verified,false);
});

test('all operator-reported PASS states only invite independent review', () => {
  const report = evaluateLocalEvidence(sample(),NOW);
  assert.equal(report.status,'ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW');
  assert.equal(report.verified_independently,false);
  assert.equal(report.production_authorized,false);
  assert.equal(report.private_10_144_routing_verified,false);
  assert.ok(!JSON.stringify(report).includes('SHOULD_NEVER_APPEAR'));
});

test('missing, invalid, and old evidence fails closed',()=>{
  const incomplete = sample(); delete incomplete.checks.recent_encrypted_peer_handshake;
  assert.equal(evaluateLocalEvidence(incomplete,NOW).status,'HOLD_INVALID_OR_STALE_EVIDENCE');
  assert.equal(evaluateLocalEvidence(null,NOW).status,'HOLD_INVALID_OR_STALE_EVIDENCE');
  const old = sample(); old.observed_at='2026-11-10T00:00:00Z';
  assert.equal(evaluateLocalEvidence(old,NOW).status,'HOLD_INVALID_OR_STALE_EVIDENCE');
  const future = sample(); future.observed_at='2026-11-14T23:00:00Z';
  assert.equal(evaluateLocalEvidence(future,NOW).status,'HOLD_INVALID_OR_STALE_EVIDENCE');
});

test('a failed negative ACL or untested revocation blocks the gate',()=>{
  const data=sample();
  data.checks.unauthorized_guest_to_admin_denied='FAIL';
  data.checks.peer_revocation_blocks_access='NOT_TESTED';
  const report=evaluateLocalEvidence(data,NOW);
  assert.equal(report.status,'HOLD_PENDING_TESTS');
  assert.ok(report.flags.some(x=>x.includes('GUEST_TO_ADMIN')));
  assert.ok(report.flags.some(x=>x.includes('REVOCATION')));
});
