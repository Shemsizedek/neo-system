import { validateGuardianEnvelope } from './guardianEnvelope.mjs';
import { createIncidentLedger } from './incidentLedger.mjs';
import { evaluateRouterAction } from '../neo-router/neo-hacker-gate.mjs';

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [String(value)];
}

function confidenceNumber(value) {
  const n = Number.parseFloat(String(value ?? '0').replace('%',''));
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? Math.max(0, Math.min(1, n / 100)) : Math.max(0, Math.min(1, n));
}

export function createGuardianSecurityPipeline({ ledger = createIncidentLedger() } = {}) {
  function ingest(envelope, { requestedAction = 'investigate-reliability', target = {}, humanApproved = false } = {}) {
    const validated = validateGuardianEnvelope(envelope);
    if (!validated.ok) return { accepted: false, stage: 'guardian-validation', reason: validated.reason };

    const event = validated.event;
    const incident = ledger.append({
      type: `guardian:${event.title || 'security-event'}`,
      severity: event.severity,
      state: event.classification,
      deviceId: event.source || null,
      service: event.affected || null,
      confidence: confidenceNumber(event.confidence),
      evidence: asList(event.evidence),
      containment: asList(event.containment),
      credentialRotationRecommended: false,
      remediation: asList(event.remediation),
      verification: asList(event.verification),
    });

    const router = evaluateRouterAction({
      action: requestedAction,
      target,
      approved: humanApproved,
      untrustedInstruction: true,
    });

    return Object.freeze({
      accepted: true,
      event,
      incident,
      ledger: ledger.verify(),
      router: Object.freeze({
        ...router,
        source: 'neo-guardian',
        sourceTrust: 'UNTRUSTED_OBSERVATION',
        analysisOnly: requestedAction === 'investigate-reliability',
      }),
    });
  }

  return Object.freeze({ ingest, listIncidents: ledger.list, verifyLedger: ledger.verify });
}
