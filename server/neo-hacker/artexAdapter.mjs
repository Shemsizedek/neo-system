import { createHash } from 'node:crypto';
import { createGuardianSecurityPipeline } from './guardianPipeline.mjs';

// Pinned to the release commit, not to a mutable branch or Docker Hub image.
export const ARTEX_RELEASE = Object.freeze({
  repository: 'BaaRai/ARTEX',
  version: 'v0.7.0',
  commit: '22ae88afabf66e47e73644a0528d8b427c4c80b8',
});

const SEVERITIES = new Set(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const CATEGORIES = new Set([
  'configuration', 'injection', 'authentication', 'authorization',
  'exposure', 'cryptography', 'dependency', 'other',
]);

function parseOrigin(raw) {
  if (typeof raw !== 'string') throw new TypeError('target URL is required');
  const url = new URL(raw);
  if (url.username || url.password || url.protocol !== 'http:') {
    throw new Error('ARTEX lab requires plain HTTP with no URL credentials');
  }
  return url.origin;
}

// Restrict the first integration gate to loopback targets. An application-level
// allowlist is necessary but NEVER replaces network-level egress isolation.
function labOrigin(raw) {
  const origin = parseOrigin(raw);
  const url = new URL(origin);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('non-lab ARTEX origin rejected');
  }
  return origin;
}

function asCategory(value) {
  const category = String(value ?? '').trim().toLowerCase();
  return CATEGORIES.has(category) ? category : 'other';
}

function prepareFinding(finding, allowed) {
  if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
    throw new TypeError('invalid ARTEX finding');
  }
  const origin = labOrigin(finding.target_url);
  if (!allowed.has(origin)) throw new Error('ARTEX target outside exact allowlist');
  const severity = String(finding.severity ?? '').toUpperCase();
  if (!SEVERITIES.has(severity)) throw new Error('invalid ARTEX severity');
  const category = asCategory(finding.category);
  // Hash external evidence pointers, never export URL paths, raw traffic,
  // headers, prompts, credentials, user-controlled titles or request bodies.
  const fingerprint = createHash('sha256').update(JSON.stringify({
    target: origin, severity, category,
    reference: String(finding.id ?? '').slice(0, 256),
  })).digest('hex');
  return {
    schema: 'neo.guardian.hacker.event.v1',
    source: 'artex:isolated-lab',
    instruction_policy: 'DATA_ONLY_NO_EXECUTION',
    sink_policy: 'ANALYSIS_ONLY_NO_TOOL_AUTHORITY',
    human_999_required_for_consequential_action: true,
    severity,
    // One ARTEX finding alone is not independent proof of an attack.
    classification: 'SUSPICION',
    title: 'ARTEX candidate finding: ' + category,
    affected: origin,
    evidence: 'sha256:' + fingerprint + '; ARTEX raw proof retained in isolated lab',
    confidence: '0',
    containment: 'No automated action; request operator review',
    remediation: 'Validate finding and propose a separately approved change',
    verification: 'Independent retest against the authorized lab target',
  };
}

export function createArtexLabIngestor({
  allowedOrigins = ['http://127.0.0.1:8080'],
  pipeline = createGuardianSecurityPipeline(),
} = {}) {
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
    throw new Error('ARTEX needs a nonempty explicit lab allowlist');
  }
  const allowed = new Set(allowedOrigins.map(labOrigin));
  function ingestReport(report) {
    if (!report || !Array.isArray(report.findings) || report.findings.length > 100) {
      throw new TypeError('ARTEX report requires at most 100 findings');
    }
    // Validate the ENTIRE batch before writing any incident ledger entries.
    const envelopes = report.findings.map(f => prepareFinding(f, allowed));
    const outcomes = envelopes.map(e => pipeline.ingest(e));
    if (outcomes.some(o => !o.accepted || o.router?.analysisOnly !== true)) {
      throw new Error('NEO defensive pipeline refused ARTEX report');
    }
    return Object.freeze({
      accepted: outcomes.length,
      rejected: 0,
      reports: outcomes.map(o => Object.freeze({
        incidentHash: o.incident.hash,
        severity: o.incident.severity,
        state: o.incident.state,
        approvedActions: 0,
      })),
      ledger: pipeline.verifyLedger(),
    });
  }
  return Object.freeze({
    ingestReport,
    verifyLedger: pipeline.verifyLedger,
    allowedOrigins: Object.freeze([...allowed]),
  });
}
