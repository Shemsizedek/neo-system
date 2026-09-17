import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSecurityIncident, analyzeIncidentLedger } from './securityAnalysis.mjs';

test('security analysis remains read-only and cannot authorize tools', () => {
  const result = analyzeSecurityIncident({
    type: 'guardian-event', severity: 'HIGH', state: 'SUSPICION', confidence: 0.8,
    evidence: ['VPN disconnected'], credentialRotationRecommended: false,
  });
  assert.equal(result.mode, 'READ_ONLY_ANALYSIS');
  assert.equal(result.canAuthorizeTools, false);
  assert.equal(result.canMutateInfrastructure, false);
  assert.equal(result.canDeploy, false);
  assert.equal(result.requiresHumanAuthorizationForConsequentialAction, true);
  assert.equal(result.priority, 'HIGH_REVIEW');
});

test('critical confirmed event escalates review priority but not authority', () => {
  const result = analyzeSecurityIncident({
    type: 'confirmed-device-event', severity: 'CRITICAL', state: 'CONFIRMED_SECURITY_EVENT', confidence: 0.95,
    evidence: ['independent corroboration A', 'independent corroboration B'], credentialRotationRecommended: true,
  });
  assert.equal(result.priority, 'URGENT_REVIEW');
  assert.equal(result.canRotateCredentials, false);
  assert.match(result.recommendations.join(' '), /rotation only after/i);
});

test('ledger analysis reports highest severity without gaining authority', () => {
  const result = analyzeIncidentLedger([
    { type: 'a', severity: 'LOW', state: 'OBSERVATION' },
    { type: 'b', severity: 'HIGH', state: 'SUSPICION' },
  ]);
  assert.equal(result.count, 2);
  assert.equal(result.highestSeverity, 'HIGH');
  assert.equal(result.canAuthorizeTools, false);
});
