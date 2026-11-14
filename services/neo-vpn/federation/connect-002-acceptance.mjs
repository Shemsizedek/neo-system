#!/usr/bin/env node
// NEO-CONNECT-002 local evidence rubric: operator input is not independent proof.
// Returns only fixed field names and status codes; never echoes raw evidence or secrets.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const REQUIREMENTS = Object.freeze([
  'two_independently_controlled_devices',
  'two_distinct_authorized_operators',
  'recent_encrypted_peer_handshake',
  'permitted_test_service_request',
  'broad_default_allow_disabled',
  'unauthorized_guest_to_admin_denied',
  'unauthorized_guest_to_finance_denied',
  'unauthorized_guest_to_bots_denied',
  'peer_revocation_blocks_access',
  'application_session_revocation_verified',
]);
const VALID = new Set(['PASS', 'FAIL', 'NOT_TESTED']);

export function evaluateLocalEvidence(input, nowMs = Date.now()) {
  const invalid = () => ({
    gate: 'NEO-CONNECT-002',
    evidence_source: 'LOCAL_OPERATOR_SELF_REPORT',
    status: 'HOLD_INVALID_OR_STALE_EVIDENCE',
    flags: ['INVALID_OR_MISSING_EVIDENCE'],
    production_authorized: false,
    private_10_144_routing_verified: false,
  });
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      input.source !== 'LOCAL_OPERATOR_SELF_REPORT' ||
      typeof input.observed_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(input.observed_at) ||
      !input.checks || typeof input.checks !== 'object' || Array.isArray(input.checks)) return invalid();

  const observed = Date.parse(input.observed_at);
  if (!Number.isFinite(observed) || !Number.isFinite(nowMs) ||
      observed > nowMs + 60_000 || nowMs - observed > 24 * 60 * 60 * 1000) return invalid();

  const checks = {};
  for (const key of REQUIREMENTS) {
    const v = input.checks[key];
    if (!VALID.has(v)) return invalid();
    checks[key] = v;
  }
  const fail = REQUIREMENTS.filter(k => checks[k] === 'FAIL');
  const missing = REQUIREMENTS.filter(k => checks[k] === 'NOT_TESTED');
  const allPass = fail.length === 0 && missing.length === 0;
  return {
    gate: 'NEO-CONNECT-002',
    observed_at: new Date(observed).toISOString(),
    evidence_source: 'LOCAL_OPERATOR_SELF_REPORT',
    checks,
    flags: [...fail.map(k => 'FAILED_' + k.toUpperCase()),
            ...missing.map(k => 'NOT_TESTED_' + k.toUpperCase())],
    status: allPass ? 'ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW' : 'HOLD_PENDING_TESTS',
    verified_independently: false,
    private_10_144_routing_verified: false,
    production_authorized: false,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const index = process.argv.indexOf('--evidence');
  if (index < 0 || !process.argv[index + 1]) {
    process.stderr.write('Usage: node connect-002-acceptance.mjs --evidence /private/path/local-evidence.json\n');
    process.exitCode = 2;
  } else {
    try {
      const input = JSON.parse(readFileSync(process.argv[index + 1], 'utf8'));
      const report = evaluateLocalEvidence(input);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (!report.status.startsWith('ELIGIBLE_')) process.exitCode = 2;
    } catch {
      process.stdout.write(JSON.stringify(evaluateLocalEvidence(null), null, 2) + '\n');
      process.exitCode = 2;
    }
  }
}
