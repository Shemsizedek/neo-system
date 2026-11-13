import test from 'node:test';
import assert from 'node:assert/strict';
import { planPeerAdmission, isActiveMember, canAccessMemberResource, planPeerRevocations } from '../identity/peer-policy.mjs';

const NOW = new Date('2026-11-08T15:00:00Z');
const K1 = 'A'.repeat(43) + '=';
const K2 = 'B'.repeat(43) + '=';
const invitation = {
  deviceId: 'member-device-1',
  publicKey: K1,
  identityVerified: true,
  deviceAttested: true,
  approvedBy: 'approved-operator',
  role: 'guest',
  overlayAddress: '10.144.50.10/32',
  expiresAt: '2026-12-01T00:00:00Z'
};

test('guest enrollment requires independent identity proof, approval, expiry and role-zone address', () => {
  const approved = planPeerAdmission(invitation, [], NOW);
  assert.equal(approved.ok, true);
  assert.equal(approved.candidate.status, 'pending_runtime_enforcement');
  assert.deepEqual(approved.candidate.allowedResources, ['public-portal']);
  assert.equal(planPeerAdmission({ ...invitation, deviceAttested: false }, [], NOW).ok, false);
  assert.equal(planPeerAdmission({ ...invitation, approvedBy: '' }, [], NOW).ok, false);
  assert.equal(planPeerAdmission({ ...invitation, role: 'admin' }, [], NOW).ok, false);
  assert.equal(planPeerAdmission({ ...invitation, overlayAddress: '10.144.10.10/32' }, [], NOW).ok, false);
  assert.equal(planPeerAdmission({ ...invitation, expiresAt: '2026-11-01T00:00:00Z' }, [], NOW).ok, false);
});

test('duplicate device ID, public key, or address is refused', () => {
  const existing = [planPeerAdmission(invitation, [], NOW).candidate];
  assert.equal(planPeerAdmission(invitation, existing, NOW).reason, 'duplicate_device_key_or_address');
  assert.equal(planPeerAdmission({ ...invitation, deviceId: 'other-device', publicKey: K2 }, existing, NOW).reason, 'duplicate_device_key_or_address');
  assert.equal(planPeerAdmission({ ...invitation, deviceId: 'other-device', overlayAddress: '10.144.50.11/32' }, existing, NOW).reason, 'duplicate_device_key_or_address');
});

test('partner enrollment is separate and never implies administrative access', () => {
  const partner = planPeerAdmission({
    ...invitation, role: 'partner', deviceId: 'partner-1', publicKey: K2,
    overlayAddress: '10.144.60.10/32'
  }, [], NOW);
  assert.equal(partner.ok, true);
  const active = { ...partner.candidate, status: 'active' };
  assert.equal(canAccessMemberResource(active, 'partner-portal', NOW), true);
  assert.equal(canAccessMemberResource(active, 'admin-api', NOW), false);
  assert.equal(canAccessMemberResource(active, 'bot-network', NOW), false);
});

test('guest cannot use partner resources and inactive or expired peers fail closed', () => {
  const guest = { ...planPeerAdmission(invitation, [], NOW).candidate, status: 'active' };
  assert.equal(canAccessMemberResource(guest, 'public-portal', NOW), true);
  assert.equal(canAccessMemberResource(guest, 'partner-portal', NOW), false);
  assert.equal(canAccessMemberResource({ ...guest, status: 'pending_runtime_enforcement' }, 'public-portal', NOW), false);
  assert.equal(canAccessMemberResource(guest, 'public-portal', new Date('2027-01-01T00:00:00Z')), false);
  assert.equal(canAccessMemberResource({ ...guest, revokedAt: NOW.toISOString() }, 'public-portal', NOW), false);
});

test('expired and revoked peers produce explicit revocation requests, not fake host actions', () => {
  const guest = { ...planPeerAdmission(invitation, [], NOW).candidate, status: 'active' };
  assert.equal(isActiveMember(guest, NOW), true);
  assert.equal(planPeerRevocations([guest], NOW).length, 0);
  const later = new Date('2027-01-01T00:00:00Z');
  assert.deepEqual(planPeerRevocations([guest], later), [{ deviceId: guest.deviceId, publicKey: K1, action: 'REVOKE_REQUESTED' }]);
  assert.equal(planPeerRevocations([{ ...guest, revokedAt: NOW.toISOString() }], NOW).length, 1);
});
