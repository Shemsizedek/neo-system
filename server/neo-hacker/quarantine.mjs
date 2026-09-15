const clone = (v) => structuredClone(v);

export function createQuarantineRecord({ deviceId, reason, score = 100, now = Date.now() } = {}) {
  if (!deviceId) throw new TypeError('deviceId is required');
  return Object.freeze({
    deviceId,
    status: 'quarantined',
    reason: reason ?? 'attestation-failed',
    score,
    quarantinedAt: new Date(now).toISOString(),
    allowedCapabilities: ['heartbeat', 'attestation', 'recovery'],
    deniedCapabilities: ['tool-execution', 'connector-access', 'deployment', 'credential-use', 'financial-signing'],
  });
}

export function applyQuarantine({ registry, record } = {}) {
  if (!registry || !record) throw new TypeError('registry and record are required');
  if (typeof registry.quarantine === 'function') registry.quarantine(record.deviceId, clone(record));
  else if (typeof registry.revoke === 'function') registry.revoke(record.deviceId, record.reason);
  else throw new TypeError('registry must support quarantine or revoke');
  return clone(record);
}

export function enforceQuarantine({ device, requestedCapability } = {}) {
  if (!device) return { allowed: false, reason: 'unknown-device' };
  if (device.status !== 'quarantined') return { allowed: true, reason: 'device-not-quarantined' };
  const allowed = new Set(device.allowedCapabilities ?? ['heartbeat', 'attestation', 'recovery']);
  return allowed.has(requestedCapability)
    ? { allowed: true, reason: 'quarantine-recovery-capability' }
    : { allowed: false, reason: 'device-quarantined' };
}
