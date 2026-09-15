import crypto from 'node:crypto';
import { evaluateAttestation } from './attestation.mjs';

const canonical = (v) => JSON.stringify(v, Object.keys(v).sort());

export function createRecoveryRequest({ deviceId, baselineDigest, recoveryNonce, requestedAt = Date.now() } = {}) {
  if (!deviceId || !baselineDigest || !recoveryNonce) throw new TypeError('deviceId, baselineDigest, and recoveryNonce are required');
  return Object.freeze({ deviceId, baselineDigest, recoveryNonce, requestedAt: new Date(requestedAt).toISOString() });
}

export function signRecoveryRequest({ request, privateKey } = {}) {
  if (!request || !privateKey) throw new TypeError('request and privateKey are required');
  return crypto.sign(null, Buffer.from(canonical(request)), privateKey).toString('base64');
}

export function verifyRecoveryRequest({ request, signature, publicKey, maxAgeMs = 5 * 60_000, now = Date.now() } = {}) {
  if (!request || !signature || !publicKey) return { valid:false, reason:'missing-recovery-proof' };
  const age = now - Date.parse(request.requestedAt);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) return { valid:false, reason:'recovery-request-expired' };
  const valid = crypto.verify(null, Buffer.from(canonical(request)), publicKey, Buffer.from(signature, 'base64'));
  return { valid, reason: valid ? 'signature-valid' : 'signature-invalid' };
}

export function evaluateRetrust({ baseline, snapshot, request, signature, publicKey, humanApproved = false, maxAgeMs, now } = {}) {
  const proof = verifyRecoveryRequest({ request, signature, publicKey, maxAgeMs, now });
  if (!proof.valid) return { trusted:false, status:'blocked', reason:proof.reason };
  if (!humanApproved) return { trusted:false, status:'awaiting-human-approval', reason:'human-approval-required' };
  const attestation = evaluateAttestation({ baseline, snapshot, maxDrift:0 });
  if (!attestation.trusted) return { trusted:false, status:'blocked', reason:'post-recovery-attestation-failed', attestation };
  if (request.deviceId !== snapshot.deviceId || request.baselineDigest !== baseline.digest) return { trusted:false, status:'blocked', reason:'recovery-binding-mismatch', attestation };
  return { trusted:true, status:'retrusted', reason:'signed-recovery-and-attestation-verified', attestation };
}
