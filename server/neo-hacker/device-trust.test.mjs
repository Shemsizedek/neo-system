import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceRegistry } from './deviceRegistry.mjs';
import { evaluateRouterTrust } from './routerTrustGate.mjs';

const clockNow = Date.parse('2026-09-14T12:00:00Z');
const registry = createDeviceRegistry({ clock: () => clockNow, maxHeartbeatAgeMs: 300000 });
registry.enroll({ deviceId: 'neo-linux-1', publicKey: 'PUBLIC', fingerprint: 'fp-1' });

test('unknown device is denied', () => {
  const decision = evaluateRouterTrust({ registry, deviceId: 'missing', toolRequest: { action: 'quarantine-content' } });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'unknown-device');
});

test('enrolled device requires verified heartbeat', () => {
  const decision = evaluateRouterTrust({ registry, deviceId: 'neo-linux-1', toolRequest: { action: 'quarantine-content' } });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'heartbeat-required');
});

test('valid signed heartbeat establishes trust', () => {
  const hb = registry.recordHeartbeat({
    deviceId: 'neo-linux-1',
    timestamp: '2026-09-14T12:00:00Z',
    nonce: 'n-1',
    payloadHash: 'hash-1',
    signature: 'sig-1',
    verifySignature: ({ signature }) => signature === 'sig-1'
  });
  assert.equal(hb.accepted, true);
  const decision = evaluateRouterTrust({ registry, deviceId: 'neo-linux-1', toolRequest: { action: 'quarantine-content' } });
  assert.equal(decision.allowed, true);
});

test('untrusted content cannot escalate tool action', () => {
  const decision = evaluateRouterTrust({
    registry,
    deviceId: 'neo-linux-1',
    toolRequest: { action: 'authorized-vulnerability-scan', target: { neoOwned: true }, untrustedInstruction: true }
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'untrusted-content-cannot-authorize-tool-action');
});

test('revoked device is denied even if previously trusted', () => {
  registry.revoke('neo-linux-1');
  const decision = evaluateRouterTrust({ registry, deviceId: 'neo-linux-1', toolRequest: { action: 'quarantine-content' } });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'device-revoked');
});
