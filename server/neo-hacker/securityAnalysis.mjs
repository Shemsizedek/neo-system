const RANK = Object.freeze({ INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 });

function clean(value, max = 2048) {
  const text = String(value ?? '').replace(/\0/g, '').replace(/\r/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function analyzeSecurityIncident(input = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('incident is required');
  const severity = RANK[input.severity] === undefined ? 'INFO' : input.severity;
  const confirmed = input.state === 'CONFIRMED_SECURITY_EVENT';
  const confidence = Math.max(0, Math.min(1, Number(input.confidence ?? 0)));

  const observations = [
    clean(input.type, 256),
    clean(input.service, 256),
    ...(Array.isArray(input.evidence) ? input.evidence.map(v => clean(v, 512)) : [clean(input.evidence, 512)]),
  ].filter(Boolean);

  const priority = confirmed && severity === 'CRITICAL' ? 'URGENT_REVIEW'
    : RANK[severity] >= RANK.HIGH ? 'HIGH_REVIEW'
    : RANK[severity] >= RANK.MEDIUM ? 'REVIEW'
    : 'MONITOR';

  const recommendations = [];
  if (RANK[severity] >= RANK.HIGH) recommendations.push('Verify the finding using an independent source before consequential action.');
  if (input.credentialRotationRecommended === true) recommendations.push('Consider credential rotation only after affected credentials and scope are verified from a trusted device.');
  recommendations.push('Preserve the incident-ledger record and compare against recent Guardian posture and infrastructure-health observations.');

  return Object.freeze({
    consumer: 'NEOsync/NEO-Oracle-security-analysis',
    mode: 'READ_ONLY_ANALYSIS',
    sourceTrust: 'UNTRUSTED_EVIDENCE',
    priority,
    severity,
    state: input.state ?? 'OBSERVATION',
    confidence,
    summary: clean(input.type || 'Guardian security event', 512),
    observations: Object.freeze(observations),
    recommendations: Object.freeze(recommendations),
    requiresHumanAuthorizationForConsequentialAction: true,
    canAuthorizeTools: false,
    canMutateInfrastructure: false,
    canRotateCredentials: false,
    canDeploy: false,
    canPersist: false,
  });
}

export function analyzeIncidentLedger(ledgerEntries = []) {
  if (!Array.isArray(ledgerEntries)) throw new TypeError('ledgerEntries must be an array');
  const analyses = ledgerEntries.map(analyzeSecurityIncident);
  const highest = analyses.reduce((best, item) => RANK[item.severity] > RANK[best] ? item.severity : best, 'INFO');
  return Object.freeze({
    consumer: 'NEOsync/NEO-Oracle-security-analysis',
    mode: 'READ_ONLY_ANALYSIS',
    count: analyses.length,
    highestSeverity: highest,
    analyses: Object.freeze(analyses),
    canAuthorizeTools: false,
    canMutateInfrastructure: false,
  });
}
