import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assessProtectedNeopassAuditRun } from './ki022-protected-audit-receipt.mjs';

const NOW = '2026-10-25T17:15:00Z';
const ID = 40255512345;
const EXPECTED = 'KI-016 NEOpass Production Signing Metadata Audit';
const REPO = 'Shemsizedek/neo-system';
const FILE = '.github/workflows/ki016-gcp-neopass-metadata-audit.yml';
const fixture = () => ({
  action: 'completed',
  repository: { full_name: REPO, default_branch: 'main' },
  workflow_run: {
    id: ID,
    workflow_id: 12345678,
    name: EXPECTED,
    path: REPO + '/' + FILE + '@main',
    event: 'workflow_dispatch',
    head_branch: 'main',
    head_sha: 'a'.repeat(40),
    head_repository: { full_name: REPO },
    repository: { full_name: REPO },
    status: 'completed',
    conclusion: 'success',
    run_attempt: 1,
    html_url: 'https://github.com/' + REPO + '/actions/runs/' + ID,
    created_at: '2026-10-25T17:10:00Z',
    updated_at: '2026-10-25T17:14:00Z',
    actor: { login: 'private-operator-test' }
  }
});
const run = event => assessProtectedNeopassAuditRun(event, { now: () => new Date(NOW) });

test('KI-022 recognizes reviewed-main, manual protected workflow success as source receipt ONLY', () => {
  const result = run(fixture());
  assert.equal(result.status, 'PROTECTED_AUDIT_WORKFLOW_SUCCEEDED_ONLY');
  assert.equal(result.protectedAuditRunSucceeded, true);
  assert.equal(result.sourceWorkflowRunId, ID);
  assert.equal(result.sourceReceiptSha256?.length, 64);
  assert.equal(result.productionWritesApproved, false);
  assert.equal(result.effectiveRuntimeSecretAccessVerified, false);
  assert.equal(result.protectedEnvironmentApprovalIndependentlyVerified, false);
  assert.equal(result.liveNeopassIdentityVerified, false);
  assert.equal(result.isolatedProductionStorageVerified, false);
  assert.equal(result.productionRestoreVerified, false);
  assert.equal(result.dualSignedPilotVerified, false);
});

test('KI-022 failed or cancelled protected audits remain blocked and never certify IAM', () => {
  for (const conclusion of ['failure', 'cancelled', 'timed_out', 'action_required', 'skipped', 'neutral']) {
    const value = fixture();
    value.workflow_run.conclusion = conclusion;
    const result = run(value);
    assert.equal(result.status, 'BLOCKED', conclusion);
    assert.equal(result.protectedAuditRunSucceeded, false);
    assert.equal(result.productionWritesApproved, false);
  }
});

test('KI-022 rejects automatic push, PR or scheduled events masquerading as protected audit', () => {
  for (const event of ['push', 'pull_request', 'schedule', 'workflow_run']) {
    const value = fixture();
    value.workflow_run.event = event;
    assert.equal(run(value).reason, 'untrusted_workflow_provenance');
  }
});

test('KI-022 rejects wrong repositories, forked head, wrong workflow name and unrelated jobs', () => {
  const variations = [
    v => { v.repository.full_name = 'attacker/neo-system'; },
    v => { v.repository.default_branch = 'dev'; },
    v => { v.workflow_run.head_repository.full_name = 'attacker/neo-system'; },
    v => { v.workflow_run.repository.full_name = 'attacker/neo-system'; },
    v => { v.workflow_run.name = 'Attacker IAM Audit'; },
    v => { v.workflow_run.path = '.github/workflows/attacker.yml@main'; },
    v => { v.workflow_run.head_branch = 'feature/untrusted'; }
  ];
  for (const modify of variations) {
    const value = fixture();
    modify(value);
    assert.equal(run(value).status, 'BLOCKED');
  }
});

test('KI-022 blocks forged or mismatched run URLs, ids and invalid Git commits', () => {
  const changes = [
    v => { v.workflow_run.html_url = 'https://evil.example/actions/runs/' + ID; },
    v => { v.workflow_run.html_url += '?token=secret'; },
    v => { v.workflow_run.id = -1; },
    v => { v.workflow_run.workflow_id = 'not-an-id'; },
    v => { v.workflow_run.head_sha = 'g'.repeat(40); },
    v => { v.workflow_run.run_attempt = 0; },
    v => { v.workflow_run.run_attempt = 101; }
  ];
  for (const change of changes) {
    const value = fixture();
    change(value);
    assert.equal(run(value).status, 'BLOCKED');
  }
});

test('KI-022 rejects stale, future and inconsistent audit timestamps', () => {
  const values = [
    { updated_at: '2026-09-01T00:00:00Z', created_at: '2026-08-31T00:00:00Z' },
    { updated_at: '2026-10-25T17:35:00Z' },
    { created_at: '2026-10-25T17:25:00Z' },
    { updated_at: 'invalid-timestamp' }
  ];
  for (const changed of values) {
    const value = fixture();
    Object.assign(value.workflow_run, changed);
    assert.equal(run(value).reason, 'stale_or_invalid_run_timestamps');
  }
});

test('KI-022 handles both GitHub workflow path layouts and main ref suffixes', () => {
  for (const value of [
    FILE, FILE + '@main', FILE + '@refs/heads/main',
    REPO + '/' + FILE, REPO + '/' + FILE + '@refs/heads/main'
  ]) {
    const input = fixture();
    input.workflow_run.path = value;
    assert.equal(run(input).protectedAuditRunSucceeded, true, value);
  }
});

test('KI-022 blocks malformed, missing, and untrusted action payloads without exceptions', () => {
  for (const payload of [null, {}, [], { action: 'requested' }, { ...fixture(), workflow_run: null }]) {
    const result = run(payload);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.productionWritesApproved, false);
  }
});

test('KI-022 source receipt omits actor identities, cloud secrets and raw GitHub event data', () => {
  const event = fixture();
  event.workflow_run.actor.login = 'sensitive-neopass-operator';
  event.workflow_run.privateSecret = 'never-print-secret-data';
  const result = run(event);
  const json = JSON.stringify(result);
  for (const forbidden of ['sensitive-neopass-operator', 'never-print-secret-data', 'client_secret', 'bearer']) {
    assert.equal(json.includes(forbidden), false);
  }
  assert.deepEqual(Object.keys(result).filter(k => /secret|operator|account|token/i.test(k)), []);
});

test('KI-022 CLI emits only safe receipt JSON and fails on an unsuccessful protected run', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ki022-run-'));
  const inputPath = path.join(dir, 'workflow-run.json');
  try {
    const event = fixture();
    // CLI runs with real wall clock; use a dynamic but consistent timestamp
    // solely for this synthetic fixture, not a live GCP identity.
    const date = new Date().toISOString();
    event.workflow_run.created_at = date;
    event.workflow_run.updated_at = date;
    await fs.writeFile(inputPath, JSON.stringify(event));
    const success = spawnSync(process.execPath, ['scripts/ki022-protected-audit-receipt.mjs', inputPath], {
      encoding: 'utf8'
    });
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).productionWritesApproved, false);
    assert.equal(success.stdout.includes('private-operator-test'), false);
    const bad = { ...event, workflow_run: { ...event.workflow_run, conclusion: 'failure' } };
    await fs.writeFile(inputPath, JSON.stringify(bad));
    const failed = spawnSync(process.execPath, ['scripts/ki022-protected-audit-receipt.mjs', inputPath], {
      encoding: 'utf8'
    });
    assert.notEqual(failed.status, 0);
    assert.equal(JSON.parse(failed.stdout).status, 'BLOCKED');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
