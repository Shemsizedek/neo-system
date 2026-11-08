import test from 'node:test';
import assert from 'node:assert/strict';
import { assessGatewayInventory } from '../diagnostics/gcp-inventory-report.mjs';

const snapshot = '2026-11-08T21:10:00.000Z';
const vm = {
  name: 'neo-vpn-node-001',
  status: 'RUNNING',
  canIpForward: true,
  networkInterfaces: [{ accessConfigs: [{ natIP: '203.0.113.20' }] }]
};
const address = [{ address: '203.0.113.20', status: 'IN_USE', addressType: 'EXTERNAL' }];

test('even an apparently provisioned VM is never declared a live VPN', () => {
  const result = assessGatewayInventory([vm], address, { capturedAt: snapshot });
  assert.equal(result.inventory, 'FOUND');
  assert.equal(result.machine_running, true);
  assert.equal(result.ip_forwarding_enabled, true);
  assert.equal(result.public_endpoint_present, true);
  assert.equal(result.public_address_reserved, true);
  for (const key of ['wireguard_verified','peer_handshakes_verified',
    'firewall_isolation_verified','two_device_acceptance_verified']) {
    assert.equal(result[key], false, key);
  }
  assert.equal(result.production_state, 'NOT_CERTIFIED');
  assert.equal(JSON.stringify(result).includes('203.0.113.20'), false);
});

test('absent VM returns not found in authorized project, not global absence', () => {
  const result = assessGatewayInventory([], [], { capturedAt: snapshot });
  assert.equal(result.inventory, 'NOT_FOUND_IN_AUTHORIZED_PROJECT');
  assert.equal(result.production_state, 'NOT_CERTIFIED');
});

test('multiple same-name instances require human reconciliation', () => {
  const result = assessGatewayInventory([vm, vm], address, { capturedAt: snapshot });
  assert.equal(result.inventory, 'AMBIGUOUS_MULTIPLE_MATCHES');
  assert.equal(result.production_state, 'NOT_CERTIFIED');
});

test('stopped VM with ephemeral IP does not pass readiness', () => {
  const result = assessGatewayInventory([{...vm, status:'TERMINATED', canIpForward:false}], [],
    { capturedAt: snapshot });
  assert.equal(result.machine_running, false);
  assert.equal(result.public_endpoint_present, true);
  assert.equal(result.public_address_reserved, false);
  assert.equal(result.production_state, 'NOT_CERTIFIED');
});

test('read failures fail closed instead of assuming no VM', () => {
  assert.throws(() => assessGatewayInventory(null, []), /instance_and_address_arrays_required/);
  assert.throws(() => assessGatewayInventory([], null), /instance_and_address_arrays_required/);
});
