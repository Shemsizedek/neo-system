import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuardianSecurityPipeline } from './guardianPipeline.mjs';

const baseEnvelope = {
  schema: 'neo.guardian.hacker.event.v1',
  source: 'guardian.android:test-device',
  instruction_policy: 'DATA_ONLY_NO_EXECUTION',
  sink_policy: 'ANALYSIS_ONLY_NO_TOOL_AUTHORITY',
  human_999_required_for_consequential_action: true,
  severity: 'HIGH',
  classification: 'SUSPICION',
  title: 'VPN disconnected during Work Shield',
  evidence: 'vpn=true -> false',
  affected: 'active network',
  confidence: '0.8',
  containment: 'Pause privileged administration',
  remediation: 'Restore approved VPN',
  verification: 'Confirm VPN transport is active',
};

test('Guardian event is appended to incident ledger and may route for observation only', () => {
  const pipeline = createGuardianSecurityPipeline();
  const result = pipeline.ingest(baseEnvelope);
  assert.equal(result.accepted, true);
  assert.equal(result.incident.severity, 'HIGH');
  assert.equal(result.incident.state, 'SUSPICION');
  assert.equal(result.ledger.valid, true);
  assert.equal(result.router.allowed, true);
  assert.equal(result.router.neoHackerAction, 'observe');
  assert.equal(result.router.analysisOnly, true);
});

test('Guardian event cannot authorize consequential Router action', () => {
  const pipeline = createGuardianSecurityPipeline();
  const result = pipeline.ingest(baseEnvelope, {
    requestedAction: 'deploy-build',
    target: { neoOwned: true },
    humanApproved: true,
  });
  assert.equal(result.accepted, true);
  assert.equal(result.router.allowed, false);
  assert.equal(result.router.reason, 'untrusted-content-cannot-authorize-tool-action');
});

test('Invalid Guardian envelope is rejected before ledger or Router', () => {
  const pipeline = createGuardianSecurityPipeline();
  const result = pipeline.ingest({ ...baseEnvelope, sink_policy: 'ALLOW_TOOLS' });
  assert.deepEqual(result, { accepted: false, stage: 'guardian-validation', reason: 'tool-authority-denied' });
  assert.equal(pipeline.listIncidents().length, 0);
});

test('corroborated Guardian event becomes confirmed incident while retaining no tool authority', () => {
  const pipeline = createGuardianSecurityPipeline();
  const result = pipeline.ingest({ ...baseEnvelope, classification: 'CORROBORATED_ATTACK', severity: 'CRITICAL' });
  assert.equal(result.incident.state, 'CONFIRMED_SECURITY_EVENT');
  assert.equal(result.event.canAuthorizeTools, false);
  assert.equal(result.event.canMutateInfrastructure, false);
});
