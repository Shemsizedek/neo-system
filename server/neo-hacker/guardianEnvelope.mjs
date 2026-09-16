const SEVERITIES = new Set(['INFO','LOW','MEDIUM','HIGH','CRITICAL']);
const STATES = new Set(['OBSERVATION','SUSPICION','CONFIRMED_SECURITY_EVENT','CORROBORATED_ATTACK']);

function clampText(value, max = 2048) {
  const s = String(value ?? '').replace(/\0/g, '').replace(/\r/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function classifyNeoOutage({ githubHealthy, neoDomainHealthy, courtHealthy = true, wordpressHealthy = true } = {}) {
  if (!githubHealthy && !neoDomainHealthy) return 'PRIMARY_NEO_OUTAGE';
  if (githubHealthy && !neoDomainHealthy) return 'CUSTOM_DOMAIN_ROUTING_DEGRADED';
  if (!courtHealthy) return 'WORLD_COURT_DEGRADED';
  if (!wordpressHealthy) return 'HOLYTEMPLES_WORDPRESS_DEGRADED';
  return 'HEALTHY';
}

export function validateGuardianEnvelope(input = {}) {
  const e = typeof input === 'string' ? JSON.parse(input) : input;
  if (!e || typeof e !== 'object') return { ok: false, reason: 'invalid-envelope' };
  if (e.schema !== 'neo.guardian.hacker.event.v1') return { ok: false, reason: 'unsupported-schema' };
  if (e.instruction_policy !== 'DATA_ONLY_NO_EXECUTION') return { ok: false, reason: 'instruction-authority-denied' };
  if (e.sink_policy !== 'ANALYSIS_ONLY_NO_TOOL_AUTHORITY') return { ok: false, reason: 'tool-authority-denied' };
  if (e.human_999_required_for_consequential_action !== true) return { ok: false, reason: 'human-approval-required' };
  if (!SEVERITIES.has(e.severity)) return { ok: false, reason: 'invalid-severity' };
  const state = e.classification === 'CORROBORATED_ATTACK' ? 'CONFIRMED_SECURITY_EVENT' : e.classification;
  if (!STATES.has(e.classification)) return { ok: false, reason: 'invalid-classification' };

  return {
    ok: true,
    event: Object.freeze({
      schema: e.schema,
      source: clampText(e.source, 256),
      sourceTrust: 'UNTRUSTED_OBSERVATION',
      severity: e.severity,
      classification: state,
      title: clampText(e.title, 512),
      evidence: clampText(e.evidence),
      affected: clampText(e.affected, 512),
      confidence: clampText(e.confidence, 64),
      containment: clampText(e.containment),
      remediation: clampText(e.remediation),
      verification: clampText(e.verification),
      previousEventHash: clampText(e.previous_event_hash, 256) || 'GENESIS',
      corroborationRequired: e.corroboration_required !== false,
      canAuthorizeTools: false,
      canMutateInfrastructure: false,
      humanApprovalRequired: true,
    }),
  };
}
