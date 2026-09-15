import test from 'node:test';
import assert from 'node:assert/strict';
import { createBaseline, evaluateAttestation, continuousAttestationDecision } from './attestation.mjs';
import { createQuarantineRecord, enforceQuarantine } from './quarantine.mjs';

test('matching attestation remains trusted', () => {
  const snapshot = { deviceId: 'dev-1', bootId: 'boot-a', kernel: '6.8', agentVersion: '0.4.0', binaryHashes: ['a','b'], policyVersion: '4', secureBoot: true };
  const baseline = createBaseline(snapshot, { now: 1 });
  const result = evaluateAttestation({ baseline, snapshot });
  assert.equal(result.trusted, true);
  assert.equal(result.tampered, false);
});

test('binary or policy drift causes quarantine decision', () => {
  const baseline = createBaseline({ deviceId: 'dev-1', bootId: 'boot-a', kernel: '6.8', agentVersion: '0.4.0', binaryHashes: ['a'], policyVersion: '4', secureBoot: true });
  const snapshot = { deviceId: 'dev-1', bootId: 'boot-a', kernel: '6.8', agentVersion: '0.4.0', binaryHashes: ['evil'], policyVersion: '99', secureBoot: true };
  const result = continuousAttestationDecision({ baseline, snapshot });
  assert.equal(result.tampered, true);
  assert.equal(result.action, 'quarantine');
  assert.ok(result.score >= 50);
});

test('quarantined device retains only recovery-class capabilities', () => {
  const record = createQuarantineRecord({ deviceId: 'dev-1', reason: 'attestation-failed' });
  assert.equal(enforceQuarantine({ device: record, requestedCapability: 'recovery' }).allowed, true);
  assert.equal(enforceQuarantine({ device: record, requestedCapability: 'tool-execution' }).allowed, false);
  assert.equal(enforceQuarantine({ device: record, requestedCapability: 'credential-use' }).allowed, false);
});
