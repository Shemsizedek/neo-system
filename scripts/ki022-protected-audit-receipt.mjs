// KI-022: evaluate the provenance of a completed protected GitHub Actions
// audit run. This inspects only GitHub-supplied event metadata; it does NOT
// inspect secrets, validate effective GCP runtime access, or authorize writes.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const REPO = 'Shemsizedek/neo-system';
const WORKFLOW = 'KI-016 NEOpass Production Signing Metadata Audit';
const WORKFLOW_FILE = '.github/workflows/ki016-gcp-neopass-metadata-audit.yml';
const SHA = /^[a-f0-9]{40}$/;
const SAFE_NUMBER = value => Number.isSafeInteger(value) && value > 0;
const RESULT = Object.freeze({
  source: 'github-actions-workflow_run',
  gate: 'KI-022',
  reviewOnly: true,
  productionWritesApproved: false,
  effectiveRuntimeSecretAccessVerified: false,
  liveNeopassIdentityVerified: false,
  isolatedProductionStorageVerified: false,
  productionRestoreVerified: false,
  dualSignedPilotVerified: false
});
const blocked = reason => Object.freeze({
  ...RESULT, status: 'BLOCKED', reason, protectedAuditRunSucceeded: false
});
const toTime = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) return NaN;
  return Date.parse(value);
};
const sourcePathValid = value => {
  if (typeof value !== 'string') return false;
  // GitHub emits either a repo-qualified workflow path or a relative path
  // with an @main/@refs/heads/main suffix, depending on API version.
  const variants = [WORKFLOW_FILE, REPO + '/' + WORKFLOW_FILE];
  return variants.some(prefix => [prefix, prefix + '@main', prefix + '@refs/heads/main'].includes(value));
};
export function assessProtectedNeopassAuditRun(event, {
  now = () => new Date(),
  maxAgeHours = 48
} = {}) {
  try {
    if (!event || event.action !== 'completed' ||
        event.repository?.full_name !== REPO ||
        event.repository?.default_branch !== 'main') return blocked('untrusted_repository_event');
    const run = event.workflow_run;
    if (!run || !SAFE_NUMBER(run.id) || !SAFE_NUMBER(run.workflow_id) ||
        run.name !== WORKFLOW || !sourcePathValid(run.path) ||
        run.event !== 'workflow_dispatch' ||
        run.head_branch !== 'main' || !SHA.test(run.head_sha || '') ||
        run.head_repository?.full_name !== REPO ||
        run.repository?.full_name !== REPO ||
        run.status !== 'completed' ||
        !['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped'].includes(run.conclusion) ||
        run.html_url !== 'https://github.com/' + REPO + '/actions/runs/' + run.id) {
      return blocked('untrusted_workflow_provenance');
    }
    if (run.run_attempt != null && (!SAFE_NUMBER(run.run_attempt) || run.run_attempt > 100)) {
      return blocked('invalid_run_attempt');
    }
    const current = new Date(now()).getTime();
    const created = toTime(run.created_at);
    const updated = toTime(run.updated_at);
    if (![current, created, updated].every(Number.isFinite) ||
        !Number.isFinite(maxAgeHours) || maxAgeHours < 1 || maxAgeHours > 168 ||
        created > updated || updated > current + 5 * 60_000 ||
        current - updated > maxAgeHours * 60 * 60_000) {
      return blocked('stale_or_invalid_run_timestamps');
    }

    // Hash only stable, non-sensitive run metadata. A hash makes the receipt
    // easy to correlate, but is NOT a signed source-system IAM attestation.
    const receiptSha256 = createHash('sha256')
      .update(JSON.stringify([run.id, run.head_sha, run.conclusion, run.updated_at, run.run_attempt || 1]))
      .digest('hex');

    return Object.freeze({
      ...RESULT,
      status: run.conclusion === 'success'
        ? 'PROTECTED_AUDIT_WORKFLOW_SUCCEEDED_ONLY'
        : 'BLOCKED',
      reason: run.conclusion === 'success'
        ? 'manual_audit_workflow_passed_source_checks_only'
        : 'protected_source_workflow_not_successful',
      protectedAuditRunSucceeded: run.conclusion === 'success',
      sourceWorkflowRunId: run.id,
      sourceRunUrl: run.html_url,
      sourceHeadSha: run.head_sha,
      sourceConclusion: run.conclusion,
      sourceUpdatedAt: run.updated_at,
      sourceReceiptSha256: receiptSha256,
      // Workflow completion does not prove the environment reviewer actually
      // inspected IAM, that runtime reads work, or that live users are valid.
      effectiveRuntimeSecretAccessVerified: false,
      protectedEnvironmentApprovalIndependentlyVerified: false
    });
  } catch {
    return blocked('receipt_processing_unavailable');
  }
}

async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error('workflow_run_event_required');
  const payload = JSON.parse(await fs.readFile(filename, 'utf8'));
  const report = assessProtectedNeopassAuditRun(payload);
  // Only allowlisted report properties are printed, never the event body.
  process.stdout.write(JSON.stringify(report) + '\n');
  if (!report.protectedAuditRunSucceeded) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch {
    process.stderr.write('KI-022 protected-audit provenance BLOCKED; no live write authorization\n');
    process.exitCode = 1;
  }
}
