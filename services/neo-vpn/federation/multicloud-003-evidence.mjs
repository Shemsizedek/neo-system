#!/usr/bin/env node
// NEO-MULTICLOUD-003: privacy-preserving evidence *triage*, not transport verification.
// No NetBird API calls, no keys, no network activity, no changes to local/cloud systems.
// Operator-supplied facts are self-reports even if all checks pass.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const REQUIRED_PILOT = Object.freeze([
  'device_a_authorized',
  'device_b_authorized',
  'netbird_android_connected',
  'netbird_second_peer_connected',
  'recent_wireguard_handshake_on_second_peer',
  'private_http_response_from_android',
  'only_narrow_test_policy_allowed',
]);
export const REQUIRED_INSTITUTIONAL = Object.freeze([
  'default_all_to_all_disabled',
  'unauthorized_guest_denied',
  'peer_revocation_denies_private_access',
  'application_session_revocation_verified',
  'two_distinct_authorized_operators',
  'independent_failure_domain_verified',
  'approved_gateway_host_qualified',
  'restricted_neo_service_resource_verified',
]);
const FIELDS = [...REQUIRED_PILOT, ...REQUIRED_INSTITUTIONAL];
const RESULTS = new Set(['PASS','FAIL','NOT_TESTED']);
const fail = code => ({
  schema: 'neo.multicloud.003.evidence-review.v1',
  decision: 'HOLD_INVALID_OR_STALE_EVIDENCE',
  flags: [code],
  pilot_eligible_for_independent_review: false,
  institutional_eligible_for_independent_review: false,
  actual_wireguard_handshake_independently_verified: false,
  live_neo_private_route_certified: false,
  production_authorized: false,
});

export function evaluateEvidence(record, nowMs = Date.now()) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
    record.schema !== 'neo.multicloud.003.operator-evidence.v1' ||
    record.source !== 'LOCAL_OPERATOR_ATTESTATION' ||
    !record.observations || typeof record.observations !== 'object' ||
    !record.results || typeof record.results !== 'object' ||
    Array.isArray(record.results)) return fail('INVALID_EVIDENCE_STRUCTURE');

  const timestamps = {};
  for (const name of ['android', 'linux', 'handshake', 'private_request']) {
    const stamp = record.observations[name];
    if (typeof stamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(stamp)) {
      return fail('INVALID_TIMESTAMPS');
    }
    const parsed = Date.parse(stamp);
    if (!Number.isFinite(parsed) || !Number.isFinite(nowMs) ||
      parsed > nowMs + 60_000 || nowMs - parsed > 15 * 60_000) return fail('INVALID_OR_STALE_TIMESTAMPS');
    timestamps[name] = parsed;
  }
  // The private app response and handshake must be chronologically plausible.
  if (Math.abs(timestamps.handshake-timestamps.private_request) > 5*60_000) {
    return fail('HANDSHAKE_REQUEST_NOT_CORRELATED');
  }
  const outcomes = {};
  for (const key of FIELDS) {
    const value = record.results[key];
    if (!RESULTS.has(value)) return fail('INVALID_OR_MISSING_RESULT');
    outcomes[key] = value;
  }
  const pilotMissing = REQUIRED_PILOT.filter(k=>outcomes[k]!=='PASS');
  const institutionalMissing = REQUIRED_INSTITUTIONAL.filter(k=>outcomes[k]!=='PASS');
  const pilotReady = pilotMissing.length===0;
  const instReady = pilotReady && institutionalMissing.length===0;

  return {
    schema: 'neo.multicloud.003.evidence-review.v1',
    source: 'LOCAL_OPERATOR_ATTESTATION',
    pilot_observations_passed: REQUIRED_PILOT.length-pilotMissing.length,
    pilot_observations_required: REQUIRED_PILOT.length,
    institutional_observations_passed: REQUIRED_INSTITUTIONAL.length-institutionalMissing.length,
    institutional_observations_required: REQUIRED_INSTITUTIONAL.length,
    missing_pilot_evidence: pilotMissing.map(k=>'UNMET_'+k.toUpperCase()),
    missing_institutional_evidence: institutionalMissing.map(k=>'UNMET_'+k.toUpperCase()),
    pilot_eligible_for_independent_review: pilotReady,
    institutional_eligible_for_independent_review: instReady,
    decision: instReady ? 'INSTITUTIONAL_REVIEW_ELIGIBLE_NOT_CERTIFIED'
      : pilotReady ? 'PERSONAL_PILOT_REVIEW_ELIGIBLE_NOT_CERTIFIED'
      : 'HOLD_PENDING_REAL_PEER_EVIDENCE',
    actual_wireguard_handshake_independently_verified: false,
    live_neo_private_route_certified: false,
    failover_certified: false,
    production_authorized: false,
  };
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const index=process.argv.indexOf('--evidence');
  if (index===-1 || !process.argv[index+1]) {
    process.stderr.write('Usage: node multicloud-003-evidence.mjs --evidence /private/local/neo-evidence.json\n');
    process.exitCode=2;
  } else {
    let result;
    try {
      const raw=readFileSync(process.argv[index+1],'utf8');
      if (raw.length>16_384) throw new Error('oversized');
      result=evaluateEvidence(JSON.parse(raw));
    } catch { result=fail('EVIDENCE_READ_ERROR'); }
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (result.decision.startsWith('HOLD_')) process.exitCode=2;
  }
}
