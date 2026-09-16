import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyNeoOutage, validateGuardianEnvelope } from './guardianEnvelope.mjs';

const base = {
  schema: 'neo.guardian.hacker.event.v1',
  source: 'guardian.android',
  source_trust: 'UNTRUSTED_OBSERVATION',
  instruction_policy: 'DATA_ONLY_NO_EXECUTION',
  sink_policy: 'ANALYSIS_ONLY_NO_TOOL_AUTHORITY',
  human_999_required_for_consequential_action: true,
  severity: 'HIGH',
  classification: 'SUSPICION',
  title: 'VPN disconnected',
  evidence: 'vpn=true -> false',
  affected: 'active network',
  confidence: 'medium',
  containment: 'Pause privileged administration',
  remediation: 'Restore approved VPN',
  verification: 'Confirm VPN transport',
  previous_event_hash: 'abc123',
  corroboration_required: true,
};

test('accepts a valid Guardian event as data-only input', () => {
  const result = validateGuardianEnvelope(base);
  assert.equal(result.ok, true);
  assert.equal(result.event.canAuthorizeTools, false);
  assert.equal(result.event.canMutateInfrastructure, false);
  assert.equal(result.event.humanApprovalRequired, true);
});

test('rejects tool-authority escalation', () => {
  const result = validateGuardianEnvelope({ ...base, sink_policy: 'EXECUTE_TOOLS' });
  assert.deepEqual(result, { ok: false, reason: 'tool-authority-denied' });
});

test('normalizes corroborated attack to confirmed security event', () => {
  const result = validateGuardianEnvelope({ ...base, classification: 'CORROBORATED_ATTACK' });
  assert.equal(result.ok, true);
  assert.equal(result.event.classification, 'CONFIRMED_SECURITY_EVENT');
});

test('rejects unknown severity and classification', () => {
  assert.equal(validateGuardianEnvelope({ ...base, severity: 'PANIC' }).ok, false);
  assert.equal(validateGuardianEnvelope({ ...base, classification: 'COMPROMISED' }).ok, false);
});

test('GitHub healthy prevents secondary custom-domain failure from becoming primary outage', () => {
  assert.equal(classifyNeoOutage({ githubHealthy: true, neoDomainHealthy: false }), 'CUSTOM_DOMAIN_ROUTING_DEGRADED');
  assert.equal(classifyNeoOutage({ githubHealthy: false, neoDomainHealthy: false }), 'PRIMARY_NEO_OUTAGE');
  assert.equal(classifyNeoOutage({ githubHealthy: true, neoDomainHealthy: true, courtHealthy: false }), 'WORLD_COURT_DEGRADED');
});
