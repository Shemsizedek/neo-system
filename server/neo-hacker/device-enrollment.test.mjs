import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceIdentity, createEnrollmentChallenge, signEnrollment, verifyEnrollment, issueDeviceRecord } from './deviceEnrollment.mjs';
import { sanitizeTelemetry, collectLinuxSnapshot, validateCollectorPrivacy } from './linuxCollector.mjs';

test('signed device enrollment verifies and issues observe-only record', () => {
  const identity = createDeviceIdentity({ deviceId: 'neo-linux-001', label: 'primary-linux' });
  const challenge = createEnrollmentChallenge({ deviceId: identity.deviceId, now: 1000, expiresInMs: 60000 });
  const signed = signEnrollment({ challenge, privateKeyPem: identity.privateKeyPem, metadata: { platform: 'linux', arch: 'x64', hostnameHash: 'abc', agentVersion: '0.2.0' } });
  const verification = verifyEnrollment({ signedEnrollment: signed, publicKeyPem: identity.publicKeyPem, now: 2000 });
  assert.equal(verification.valid, true);
  const record = issueDeviceRecord({ signedEnrollment: signed, publicKeyPem: identity.publicKeyPem, now: 2000 });
  assert.equal(record.deviceId, 'neo-linux-001');
  assert.deepEqual(record.capabilities, ['observe-telemetry']);
});

test('expired enrollment challenge is rejected', () => {
  const identity = createDeviceIdentity({ deviceId: 'neo-linux-002' });
  const challenge = createEnrollmentChallenge({ deviceId: identity.deviceId, now: 1000, expiresInMs: 1000 });
  const signed = signEnrollment({ challenge, privateKeyPem: identity.privateKeyPem });
  assert.equal(verifyEnrollment({ signedEnrollment: signed, publicKeyPem: identity.publicKeyPem, now: 3000 }).valid, false);
});

test('collector sanitizer strips secret-bearing fields', () => {
  const clean = sanitizeTelemetry({ pid: 1, typedText: 'secret words', password: 'p', token: 't', nested: { clipboardText: 'x', severity: 'low' } });
  assert.equal(clean.typedText, undefined);
  assert.equal(clean.password, undefined);
  assert.equal(clean.token, undefined);
  assert.equal(clean.nested.clipboardText, undefined);
  assert.equal(clean.nested.severity, 'low');
});

test('Linux collector remains observe-only and privacy-valid', () => {
  const snapshot = collectLinuxSnapshot({ processList: [{ pid: 100, ppid: 1, commandName: 'node', typedText: 'do-not-store' }], network: [{ protocol: 'tcp', localPort: 443, token: 'never' }], integrity: [{ pathHash: 'a', fileHash: 'b', status: 'ok' }] });
  assert.equal(snapshot.mode, 'observe-only');
  assert.equal(validateCollectorPrivacy(snapshot).valid, true);
});
