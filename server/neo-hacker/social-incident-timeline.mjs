import crypto from 'node:crypto';

export function buildIncidentTimeline(events = []) {
  const normalized = events
    .filter(Boolean)
    .map((event, index) => normalizeEvent(event, index))
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt) || a.id.localeCompare(b.id));

  const corroboratedCount = normalized.filter((e) => e.state === 'CORROBORATED_SECURITY_EVENT').length;
  const suspicionCount = normalized.filter((e) => e.state === 'SUSPICION').length;

  return Object.freeze({
    schema: 'neo.social-shield.timeline.v1',
    generatedAt: new Date().toISOString(),
    totalEvents: normalized.length,
    corroboratedCount,
    suspicionCount,
    highestState: corroboratedCount > 0 ? 'CORROBORATED_SECURITY_EVENT' : (suspicionCount > 0 ? 'SUSPICION' : 'OBSERVATION'),
    attributionPolicy: 'NO_PERSON_OR_ORGANIZATION_ATTRIBUTION_WITHOUT_RELIABLE_EVIDENCE',
    events: Object.freeze(normalized)
  });
}

export function correlateIncidents(events = []) {
  const buckets = new Map();
  for (const event of events.filter(Boolean)) {
    const account = `${event.platform ?? 'unknown'}:${event.accountRef ?? 'unknown'}`;
    const key = `${account}:${event.signalType ?? 'unknown'}`;
    const list = buckets.get(key) ?? [];
    list.push(event);
    buckets.set(key, list);
  }

  return Object.freeze([...buckets.entries()].map(([key, list]) => Object.freeze({
    correlationKey: hash(key),
    eventCount: list.length,
    platforms: Object.freeze([...new Set(list.map((e) => String(e.platform ?? 'unknown')))]),
    signalTypes: Object.freeze([...new Set(list.map((e) => String(e.signalType ?? 'unknown')))]),
    corroborated: list.some((e) => e.state === 'CORROBORATED_SECURITY_EVENT'),
    inferencePolicy: 'CORRELATION_IS_NOT_ATTRIBUTION'
  })));
}

function normalizeEvent(event, index) {
  const observedAt = safeIso(event.observedAt);
  const evidenceHash = String(event.evidenceHash ?? hash(String(event.evidence ?? ''))).slice(0,64);
  return Object.freeze({
    id: hash(`${index}:${event.platform}:${event.accountRef}:${event.signalType}:${observedAt}:${evidenceHash}`).slice(0,24),
    platform: String(event.platform ?? 'unknown').slice(0,80),
    accountRef: String(event.accountRef ?? 'unknown').slice(0,160),
    signalType: String(event.signalType ?? 'ABUSE_SIGNAL').slice(0,80),
    observedAt,
    state: normalizeState(event.state),
    evidenceHash,
    sourceTrust: 'UNTRUSTED_CONTENT',
    executable: false
  });
}

function normalizeState(state) {
  return ['OBSERVATION','SUSPICION','CORROBORATED_SECURITY_EVENT'].includes(state) ? state : 'OBSERVATION';
}

function safeIso(value) {
  const d = new Date(value ?? Date.now());
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
