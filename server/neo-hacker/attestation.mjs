import crypto from 'node:crypto';

const clone = (v) => structuredClone(v);

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashAttestationSnapshot(snapshot = {}) {
  const material = canonicalize({
    deviceId: snapshot.deviceId ?? null,
    bootId: snapshot.bootId ?? null,
    kernel: snapshot.kernel ?? null,
    agentVersion: snapshot.agentVersion ?? null,
    binaryHashes: [...(snapshot.binaryHashes ?? [])].sort(),
    policyVersion: snapshot.policyVersion ?? null,
    secureBoot: snapshot.secureBoot ?? null,
  });
  return crypto.createHash('sha256').update(material).digest('hex');
}

export function createBaseline(snapshot = {}, { now = Date.now() } = {}) {
  if (!snapshot.deviceId) throw new TypeError('deviceId is required');
  return Object.freeze({
    deviceId: snapshot.deviceId,
    digest: hashAttestationSnapshot(snapshot),
    createdAt: new Date(now).toISOString(),
    snapshot: clone(snapshot),
  });
}

export function evaluateAttestation({ baseline, snapshot, maxDrift = 0 } = {}) {
  if (!baseline || !snapshot) throw new TypeError('baseline and snapshot are required');
  if (baseline.deviceId !== snapshot.deviceId) {
    return { trusted: false, tampered: true, score: 100, reasons: ['device-id-mismatch'] };
  }

  const currentDigest = hashAttestationSnapshot(snapshot);
  const changes = [];
  const keys = ['bootId', 'kernel', 'agentVersion', 'policyVersion', 'secureBoot'];
  for (const key of keys) {
    if ((baseline.snapshot?.[key] ?? null) !== (snapshot?.[key] ?? null)) changes.push(key);
  }

  const beforeHashes = new Set(baseline.snapshot?.binaryHashes ?? []);
  const afterHashes = new Set(snapshot?.binaryHashes ?? []);
  if (beforeHashes.size !== afterHashes.size || [...beforeHashes].some((h) => !afterHashes.has(h))) {
    changes.push('binaryHashes');
  }

  const score = Math.min(100, changes.length * 25);
  const digestMatch = currentDigest === baseline.digest;
  const trusted = digestMatch || score <= maxDrift;
  return {
    trusted,
    tampered: !trusted,
    score,
    digestMatch,
    reasons: trusted ? [] : changes.map((c) => `attestation-drift:${c}`),
    currentDigest,
    baselineDigest: baseline.digest,
  };
}

export function continuousAttestationDecision(input = {}) {
  const result = evaluateAttestation(input);
  const action = result.tampered ? 'quarantine' : 'allow';
  return { ...result, action };
}
