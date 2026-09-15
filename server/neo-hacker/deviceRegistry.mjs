import crypto from 'node:crypto';

const clone = value => structuredClone(value);
const nowIso = clock => new Date(clock()).toISOString();

export function createDeviceRegistry({ clock = () => Date.now(), maxHeartbeatAgeMs = 5 * 60 * 1000 } = {}) {
  const devices = new Map();

  function enroll(record) {
    if (!record?.deviceId || !record?.publicKey || !record?.fingerprint) throw new TypeError('deviceId, publicKey, and fingerprint are required');
    const stored = {
      ...clone(record),
      status: 'enrolled',
      enrolledAt: record.enrolledAt ?? nowIso(clock),
      lastHeartbeatAt: null,
      trust: 'pending-heartbeat'
    };
    devices.set(stored.deviceId, stored);
    return clone(stored);
  }

  function get(deviceId) {
    const item = devices.get(deviceId);
    return item ? clone(item) : null;
  }

  function revoke(deviceId, reason = 'operator-revoked') {
    const item = devices.get(deviceId);
    if (!item) return null;
    item.status = 'revoked';
    item.trust = 'revoked';
    item.revokedAt = nowIso(clock);
    item.revocationReason = reason;
    return clone(item);
  }

  function recordHeartbeat({ deviceId, timestamp, nonce, payloadHash, signature, verifySignature }) {
    const item = devices.get(deviceId);
    if (!item || item.status !== 'enrolled') return { accepted: false, reason: 'device-not-enrolled' };
    const ts = Date.parse(timestamp);
    if (!Number.isFinite(ts) || Math.abs(clock() - ts) > maxHeartbeatAgeMs) return { accepted: false, reason: 'heartbeat-stale' };
    const message = `${deviceId}.${timestamp}.${nonce}.${payloadHash}`;
    const valid = typeof verifySignature === 'function' && verifySignature({ publicKey: item.publicKey, message, signature }) === true;
    if (!valid) {
      item.trust = 'untrusted';
      return { accepted: false, reason: 'invalid-heartbeat-signature' };
    }
    item.lastHeartbeatAt = timestamp;
    item.lastHeartbeatHash = payloadHash;
    item.trust = 'trusted';
    return { accepted: true, reason: 'heartbeat-verified', device: clone(item) };
  }

  function evaluateTrust(deviceId) {
    const item = devices.get(deviceId);
    if (!item) return { trusted: false, reason: 'unknown-device' };
    if (item.status !== 'enrolled') return { trusted: false, reason: 'device-revoked' };
    if (!item.lastHeartbeatAt) return { trusted: false, reason: 'heartbeat-required' };
    if (clock() - Date.parse(item.lastHeartbeatAt) > maxHeartbeatAgeMs) return { trusted: false, reason: 'heartbeat-expired' };
    return { trusted: item.trust === 'trusted', reason: item.trust === 'trusted' ? 'trusted-device' : 'device-untrusted' };
  }

  function snapshot() {
    return [...devices.values()].map(clone);
  }

  return Object.freeze({ enroll, get, revoke, recordHeartbeat, evaluateTrust, snapshot });
}

export function hashTelemetryPayload(payload = {}) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
