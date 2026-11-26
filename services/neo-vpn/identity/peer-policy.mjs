// NET-002: pure admission / expiry policy. This module DOES NOT modify WireGuard,
// provision cloud resources or make a person an authorized member.
// A separately authenticated controller must enforce approvals and revocations.
export const MEMBER_ZONES = Object.freeze({
  guest: Object.freeze({ thirdOctet: 50, allowedResources: ['public-portal'] }),
  partner: Object.freeze({ thirdOctet: 60, allowedResources: ['public-portal', 'partner-portal'] })
});

const publicKeyFormat = /^[A-Za-z0-9+/]{43}=$/;
const expiryFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function planPeerAdmission(input, existingPeers = [], now = new Date()) {
  const role = input?.role;
  const policy = MEMBER_ZONES[role];
  if (!policy) return { ok: false, reason: 'unsupported_member_role' };
  if (!input?.identityVerified || !input?.deviceAttested || !input?.approvedBy) {
    return { ok: false, reason: 'identity_attestation_and_approval_required' };
  }
  if (!input?.deviceId || typeof input.deviceId !== 'string' ||
      !publicKeyFormat.test(String(input.publicKey ?? ''))) {
    return { ok: false, reason: 'device_id_and_valid_public_key_required' };
  }
  if (!expiryFormat.test(String(input.expiresAt ?? ''))) {
    return { ok: false, reason: 'explicit_utc_expiry_required' };
  }
  const expiration = Date.parse(input.expiresAt);
  if (!Number.isFinite(expiration) || expiration <= new Date(now).getTime()) {
    return { ok: false, reason: 'expired_or_invalid_invitation' };
  }
  const ip = String(input.overlayAddress ?? '');
  const parts = ip.match(/^10\.144\.(\d{1,3})\.(\d{1,3})\/32$/);
  if (!parts || Number(parts[1]) !== policy.thirdOctet ||
      Number(parts[2]) < 2 || Number(parts[2]) > 254) {
    return { ok: false, reason: 'address_outside_role_zone' };
  }
  if (existingPeers.some(p => p.publicKey === input.publicKey ||
      p.overlayAddress === ip || p.deviceId === input.deviceId)) {
    return { ok: false, reason: 'duplicate_device_key_or_address' };
  }
  return {
    ok: true,
    candidate: {
      deviceId: input.deviceId,
      role,
      overlayAddress: ip,
      publicKey: input.publicKey, // public ONLY; never accept/store private keys
      approvedBy: input.approvedBy,
      expiresAt: input.expiresAt,
      allowedResources: [...policy.allowedResources],
      status: 'pending_runtime_enforcement'
    }
  };
}

export function isActiveMember(peer, now = new Date()) {
  return Boolean(peer &&
    (peer.role === 'guest' || peer.role === 'partner') &&
    peer.status === 'active' &&
    !peer.revokedAt &&
    expiryFormat.test(String(peer.expiresAt ?? '')) &&
    Number.isFinite(Date.parse(peer.expiresAt)) &&
    Date.parse(peer.expiresAt) > new Date(now).getTime());
}

export function canAccessMemberResource(peer, resource, now = new Date()) {
  return isActiveMember(peer, now) &&
    MEMBER_ZONES[peer.role].allowedResources.includes(resource) &&
    Array.isArray(peer.allowedResources) &&
    peer.allowedResources.includes(resource);
}

export function planPeerRevocations(peers = [], now = new Date()) {
  return peers.filter(peer =>
    peer?.status === 'active' &&
    (Boolean(peer.revokedAt) ||
     !expiryFormat.test(String(peer.expiresAt ?? '')) ||
     !Number.isFinite(Date.parse(peer.expiresAt)) ||
     Date.parse(peer.expiresAt) <= new Date(now).getTime())
  ).map(peer => ({ deviceId: peer.deviceId, publicKey: peer.publicKey, action: 'REVOKE_REQUESTED' }));
}
