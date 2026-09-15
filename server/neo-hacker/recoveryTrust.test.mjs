import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createBaseline } from './attestation.mjs';
import { createRecoveryRequest, signRecoveryRequest, evaluateRetrust } from './recoveryTrust.mjs';
import { createIncidentLedger, SEVERITY, EVENT_STATE } from './incidentLedger.mjs';

const snapshot = { deviceId:'neo-device-1', bootId:'boot-1', kernel:'6.8', agentVersion:'0.5.0', binaryHashes:['abc'], policyVersion:'5', secureBoot:true };

test('re-trust requires signature, fresh attestation, and human approval', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const baseline = createBaseline(snapshot, { now:1_000 });
  const request = createRecoveryRequest({ deviceId:snapshot.deviceId, baselineDigest:baseline.digest, recoveryNonce:'nonce-1', requestedAt:2_000 });
  const signature = signRecoveryRequest({ request, privateKey });
  const pending = evaluateRetrust({ baseline, snapshot, request, signature, publicKey, humanApproved:false, now:2_500 });
  assert.equal(pending.status, 'awaiting-human-approval');
  const ok = evaluateRetrust({ baseline, snapshot, request, signature, publicKey, humanApproved:true, now:2_500 });
  assert.equal(ok.trusted, true);
});

test('tampered post-recovery state remains blocked', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const baseline = createBaseline(snapshot, { now:1_000 });
  const request = createRecoveryRequest({ deviceId:snapshot.deviceId, baselineDigest:baseline.digest, recoveryNonce:'nonce-2', requestedAt:2_000 });
  const signature = signRecoveryRequest({ request, privateKey });
  const changed = { ...snapshot, kernel:'changed' };
  const result = evaluateRetrust({ baseline, snapshot:changed, request, signature, publicKey, humanApproved:true, now:2_500 });
  assert.equal(result.trusted, false);
  assert.equal(result.reason, 'post-recovery-attestation-failed');
});

test('incident ledger is append-only and hash chained', () => {
  const ledger = createIncidentLedger();
  ledger.append({ type:'device.attestation.drift', severity:SEVERITY.HIGH, state:EVENT_STATE.SUSPICION, deviceId:'neo-device-1', confidence:.8, evidence:['kernel drift'] }, { now:1_000 });
  ledger.append({ type:'device.recovery.verified', severity:SEVERITY.INFO, state:EVENT_STATE.OBSERVATION, deviceId:'neo-device-1', confidence:1 }, { now:2_000 });
  const verified = ledger.verify();
  assert.equal(verified.valid, true);
  assert.equal(verified.count, 2);
});
