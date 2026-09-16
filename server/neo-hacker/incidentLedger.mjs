import crypto from 'node:crypto';

const canonicalize = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};

export const SEVERITY = Object.freeze({ INFO:'INFO', LOW:'LOW', MEDIUM:'MEDIUM', HIGH:'HIGH', CRITICAL:'CRITICAL' });
export const EVENT_STATE = Object.freeze({ OBSERVATION:'OBSERVATION', SUSPICION:'SUSPICION', CONFIRMED:'CONFIRMED_SECURITY_EVENT' });

function hashEntry(entry) {
  return crypto.createHash('sha256').update(canonicalize(entry)).digest('hex');
}

export function createIncidentLedger(seed = []) {
  const entries = [];
  for (const item of seed) append(item);

  function append(event = {}, { now = Date.now() } = {}) {
    if (!event.type) throw new TypeError('incident type is required');
    if (!Object.values(SEVERITY).includes(event.severity ?? SEVERITY.INFO)) throw new TypeError('invalid severity');
    if (!Object.values(EVENT_STATE).includes(event.state ?? EVENT_STATE.OBSERVATION)) throw new TypeError('invalid event state');
    const previousHash = entries.at(-1)?.hash ?? null;
    const record = {
      sequence: entries.length + 1,
      recordedAt: new Date(now).toISOString(),
      type: event.type,
      severity: event.severity ?? SEVERITY.INFO,
      state: event.state ?? EVENT_STATE.OBSERVATION,
      deviceId: event.deviceId ?? null,
      service: event.service ?? null,
      confidence: Math.max(0, Math.min(1, Number(event.confidence ?? 0))),
      evidence: structuredClone(event.evidence ?? []),
      containment: structuredClone(event.containment ?? []),
      credentialRotationRecommended: event.credentialRotationRecommended === true,
      remediation: structuredClone(event.remediation ?? []),
      verification: structuredClone(event.verification ?? []),
      previousHash,
    };
    record.hash = hashEntry(record);
    entries.push(Object.freeze(record));
    return structuredClone(record);
  }

  function list() { return structuredClone(entries); }
  function verify() {
    for (let i = 0; i < entries.length; i++) {
      const { hash, ...withoutHash } = entries[i];
      if (hash !== hashEntry(withoutHash)) return { valid:false, index:i, reason:'entry-hash-mismatch' };
      const expectedPrevious = i === 0 ? null : entries[i - 1].hash;
      if (entries[i].previousHash !== expectedPrevious) return { valid:false, index:i, reason:'chain-link-mismatch' };
    }
    return { valid:true, count:entries.length, head:entries.at(-1)?.hash ?? null };
  }

  return Object.freeze({ append, list, verify });
}
