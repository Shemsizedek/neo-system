const RANK = Object.freeze({ INFO:0, LOW:1, MEDIUM:2, HIGH:3, CRITICAL:4 });
const VALID_STATES = new Set(['OBSERVATION','SUSPICION','CONFIRMED_SECURITY_EVENT']);

function clean(value, max = 512) {
  const text = String(value ?? '').replace(/\0/g, '').replace(/\r/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function normalizeSignal(input = {}, index = 0) {
  const severity = RANK[input.severity] === undefined ? 'INFO' : input.severity;
  const state = VALID_STATES.has(input.state) ? input.state : 'OBSERVATION';
  return Object.freeze({
    id: clean(input.id || `signal-${index + 1}`, 128),
    channel: clean(input.channel || 'unknown-channel', 128),
    source: clean(input.source || 'unknown-source', 128),
    type: clean(input.type || 'security-observation', 256),
    severity,
    state,
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? 0))),
    affected: clean(input.affected || input.service || 'unknown', 256),
    evidence: clean(Array.isArray(input.evidence) ? input.evidence.join(' | ') : input.evidence, 1024),
  });
}

export function correlateSecuritySignals(signals = []) {
  if (!Array.isArray(signals)) throw new TypeError('signals must be an array');
  const normalized = signals.map(normalizeSignal);
  const channels = new Set(normalized.map(s => s.channel).filter(Boolean));
  const sources = new Set(normalized.map(s => s.source).filter(Boolean));
  const highestSeverity = normalized.reduce((best, s) => RANK[s.severity] > RANK[best] ? s.severity : best, 'INFO');
  const maxInputConfidence = normalized.reduce((best, s) => Math.max(best, s.confidence), 0);
  const confirmedInputs = normalized.filter(s => s.state === 'CONFIRMED_SECURITY_EVENT').length;
  const suspiciousInputs = normalized.filter(s => s.state === 'SUSPICION' || s.state === 'CONFIRMED_SECURITY_EVENT').length;

  const independentlyCorroborated = channels.size >= 2 && sources.size >= 2 && suspiciousInputs >= 2;
  const state = independentlyCorroborated ? 'CONFIRMED_SECURITY_EVENT'
    : suspiciousInputs >= 1 ? 'SUSPICION'
    : 'OBSERVATION';

  // Single-source or single-channel evidence cannot receive high confidence merely by repetition.
  let confidence = normalized.length === 0 ? 0 : normalized.reduce((sum, s) => sum + s.confidence, 0) / normalized.length;
  if (!independentlyCorroborated) confidence = Math.min(confidence, 0.69);
  else confidence = Math.min(0.95, Math.max(confidence, Math.min(0.8, maxInputConfidence)));

  const priority = state === 'CONFIRMED_SECURITY_EVENT' && highestSeverity === 'CRITICAL' ? 'URGENT_REVIEW'
    : RANK[highestSeverity] >= RANK.HIGH ? 'HIGH_REVIEW'
    : RANK[highestSeverity] >= RANK.MEDIUM ? 'REVIEW'
    : 'MONITOR';

  const reasons = [];
  if (independentlyCorroborated) reasons.push(`Corroborated across ${channels.size} channels and ${sources.size} sources.`);
  else reasons.push(`Independent corroboration incomplete: ${channels.size} channel(s), ${sources.size} source(s).`);
  if (confirmedInputs > 0 && !independentlyCorroborated) reasons.push('A source labeled an event confirmed, but the correlation layer did not independently confirm it.');

  return Object.freeze({
    consumer: 'NEO-Oracle-security-correlation',
    mode: 'READ_ONLY_CORRELATION',
    signalCount: normalized.length,
    independentChannelCount: channels.size,
    independentSourceCount: sources.size,
    independentlyCorroborated,
    state,
    highestSeverity,
    confidence: Number(confidence.toFixed(3)),
    priority,
    reasons: Object.freeze(reasons),
    signals: Object.freeze(normalized),
    requiresHumanAuthorizationForConsequentialAction: true,
    canAuthorizeTools: false,
    canMutateInfrastructure: false,
    canRotateCredentials: false,
    canDeploy: false,
    canPersist: false,
  });
}

export function correlateNeoSecurityContext({ guardian = [], infrastructure = [], github = [], attestation = [], incidentHistory = [] } = {}) {
  const tag = (items, channel) => (Array.isArray(items) ? items : []).map((item, i) => ({ ...item, channel: item.channel || channel, source: item.source || `${channel}-${i + 1}` }));
  return correlateSecuritySignals([
    ...tag(guardian, 'guardian-device'),
    ...tag(infrastructure, 'neo-infrastructure'),
    ...tag(github, 'github-deployment'),
    ...tag(attestation, 'device-attestation'),
    ...tag(incidentHistory, 'incident-history'),
  ]);
}
