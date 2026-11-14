#!/usr/bin/env node
// NEO-CONNECT-003: fail-closed assessment of local redacted observations + manual attestations.
// Does not prove real route switch, access isolation, or external audit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const PHASES = Object.freeze(['wifi_baseline', 'cellular_backup', 'wifi_restored']);
export const ATTESTATIONS = Object.freeze([
  'wifi_to_cellular_switch_observed',
  'cellular_is_separate_working_uplink',
  'return_to_wifi_observed',
  'vpn_peer_reconnected_after_switch',
  'permitted_private_service_works_over_cellular',
  'unauthorized_private_access_blocked_over_cellular',
  'second_authorized_peer_independently_controlled',
  'emergency_rollback_available',
]);
const VALID = new Set(['PASS', 'FAIL', 'NOT_TESTED']);
const statuses = new Set(['PASS', 'FAIL', 'TIMEOUT', 'BLOCKED_TARGET']);
const failure = (code) => ({ gate:'NEO-CONNECT-003', source:'LOCAL_OPERATOR_REVIEW',
  status:'HOLD', flags:[code], eligible_for_manual_review:false,
  independently_verified:false, live_failover_certified:false,
  production_authorized:false });

export function review(input, nowMs = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      !Array.isArray(input.observations) || input.observations.length !== 3 ||
      !input.attestations || typeof input.attestations !== 'object' ||
      Array.isArray(input.attestations)) return failure('INVALID_INPUT');
  const checks = [];
  const timestamps = [];
  for (let i = 0; i < 3; i++) {
    const obs = input.observations[i];
    if (obs?.schema !== 'neo.connect.003.local-probe.v1' ||
        obs?.source !== 'LOCAL_DEVICE_OBSERVATION' ||
        obs?.operator_labeled_phase !== PHASES[i] ||
        !Array.isArray(obs.target_results) || obs.target_results.length !== 2 ||
        !obs.target_results.every((x, j) => x.target_label === (j ? 'PUBLIC_B' : 'PUBLIC_A') && statuses.has(x.result))) {
      return failure('INVALID_OBSERVATIONS');
    }
    const time = Date.parse(obs.observed_at);
    if (!Number.isFinite(time)) return failure('INVALID_TIMESTAMPS');
    timestamps.push(time);
    checks.push(obs.target_results.every(x => x.result === 'PASS'));
  }
  if (!Number.isFinite(nowMs) || timestamps[0] >= timestamps[1] || timestamps[1] >= timestamps[2] ||
      timestamps[2] > nowMs + 60_000 || nowMs - timestamps[2] > 24 * 60 * 60_000 ||
      timestamps[2] - timestamps[0] > 4 * 60 * 60_000) return failure('INVALID_TIMESTAMPS');
  const attestations = {};
  for (const name of ATTESTATIONS) {
    const status = input.attestations[name];
    if (!VALID.has(status)) return failure('INVALID_ATTESTATIONS');
    attestations[name] = status;
  }
  const blockers = [
    ...PHASES.filter((_, i) => !checks[i]).map(x => 'PUBLIC_CONNECTIVITY_' + x.toUpperCase() + '_NOT_CONFIRMED'),
    ...ATTESTATIONS.filter(k => attestations[k] !== 'PASS').map(k => 'ATTESTATION_' + k.toUpperCase() + '_UNMET'),
  ];
  return {
    gate:'NEO-CONNECT-003',source:'LOCAL_OPERATOR_REVIEW',
    status:blockers.length ? 'HOLD' : 'ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW',
    public_https_checks_passed:checks,
    flags:blockers,
    eligible_for_manual_review:blockers.length===0,
    independently_verified:false, live_failover_certified:false,
    production_authorized:false,
    note:'Phase labels and user-entered attestations do not demonstrate network-interface identity, independent ISP paths, enforced ACLs or sustained application availability.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const idx = process.argv.indexOf('--evidence');
  if (idx < 0 || !process.argv[idx+1]) {
    process.stderr.write('Usage: node connect-003-review.mjs --evidence /private/local/evidence.json\n');
    process.exitCode=2;
  } else {
    let result;
    try { result=review(JSON.parse(readFileSync(process.argv[idx+1],'utf8'))); }
    catch { result=failure('EVIDENCE_UNAVAILABLE'); }
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if (!result.eligible_for_manual_review) process.exitCode=2;
  }
}
