import { createHash, generateKeyPairSync, sign, verify, randomUUID } from 'node:crypto';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createDeviceIdentity({ deviceId = randomUUID(), label = 'neo-device' } = {}) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const fingerprint = createHash('sha256').update(publicKeyPem).digest('hex');
  return { deviceId, label, publicKeyPem, privateKeyPem, fingerprint };
}

export function createEnrollmentChallenge({ deviceId, nonce = randomUUID(), expiresInMs = 5 * 60_000, now = Date.now() } = {}) {
  if (!deviceId) throw new TypeError('deviceId is required');
  return Object.freeze({ deviceId, nonce, issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + expiresInMs).toISOString(), purpose: 'neo-hacker-device-enrollment-v0.2' });
}

export function signEnrollment({ challenge, privateKeyPem, metadata = {} } = {}) {
  if (!challenge || !privateKeyPem) throw new TypeError('challenge and privateKeyPem are required');
  const safeMetadata = {
    platform: String(metadata.platform ?? ''),
    arch: String(metadata.arch ?? ''),
    hostnameHash: String(metadata.hostnameHash ?? ''),
    agentVersion: String(metadata.agentVersion ?? '0.2.0')
  };
  const payload = { challenge, metadata: safeMetadata };
  const bytes = Buffer.from(stableJson(payload));
  const signature = sign(null, bytes, privateKeyPem).toString('base64');
  return { payload, signature };
}

export function verifyEnrollment({ signedEnrollment, publicKeyPem, now = Date.now() } = {}) {
  if (!signedEnrollment || !publicKeyPem) return { valid: false, reason: 'missing-enrollment-material' };
  const { payload, signature } = signedEnrollment;
  if (!payload?.challenge || !signature) return { valid: false, reason: 'malformed-enrollment' };
  const expiresAt = Date.parse(payload.challenge.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt < now) return { valid: false, reason: 'challenge-expired' };
  const ok = verify(null, Buffer.from(stableJson(payload)), publicKeyPem, Buffer.from(signature, 'base64'));
  return { valid: ok, reason: ok ? 'signature-valid' : 'signature-invalid', deviceId: payload.challenge.deviceId };
}

export function issueDeviceRecord({ signedEnrollment, publicKeyPem, now = Date.now() } = {}) {
  const verification = verifyEnrollment({ signedEnrollment, publicKeyPem, now });
  if (!verification.valid) throw new Error(`enrollment rejected: ${verification.reason}`);
  const publicKeyFingerprint = createHash('sha256').update(publicKeyPem).digest('hex');
  return Object.freeze({
    deviceId: verification.deviceId,
    publicKeyFingerprint,
    enrolledAt: new Date(now).toISOString(),
    status: 'ACTIVE',
    trust: 'SIGNED_DEVICE',
    capabilities: ['observe-telemetry'],
    metadata: signedEnrollment.payload.metadata
  });
}
