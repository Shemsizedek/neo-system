import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const workflowPath = '.github/workflows/ki016-gcp-neopass-metadata-audit.yml';

test('KI-021 protected production audit remains manual-only and environment-gated', async () => {
  const yaml = await fs.readFile(workflowPath, 'utf8');
  assert.match(yaml, /^on:\s*\n\s+workflow_dispatch:\s*$/m);
  assert.doesNotMatch(yaml, /^\s*(push|pull_request|schedule|workflow_run):/m);
  assert.match(yaml, /environment: holytemples-production/);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /\$GITHUB_REF.*refs\/heads\/main/);
  assert.match(yaml, /permissions:\s*\n\s+contents: read\s*\n\s+id-token: write/);
});

test('KI-021 production audit reads policies and never accesses secret values or mutates IAM', async () => {
  const yaml = await fs.readFile(workflowPath, 'utf8');
  assert.match(yaml, /gcloud run services describe neo-temple-giss/);
  assert.match(yaml, /gcloud secrets get-iam-policy/);
  assert.match(yaml, /ki021-neopass-secret-iam-audit\.mjs extract-ref/);
  assert.match(yaml, /ki021-neopass-secret-iam-audit\.mjs evaluate/);
  assert.doesNotMatch(yaml, /gcloud secrets versions access/);
  assert.doesNotMatch(yaml, /gcloud secrets (add-iam-policy-binding|set-iam-policy|create|delete|versions add)/);
  assert.doesNotMatch(yaml, /gcloud run services (update|replace|deploy|delete)/);
  assert.doesNotMatch(yaml, /upload-artifact/);
  assert.match(yaml, /if: always\(\)/);
  assert.match(yaml, /rm -f "\$RUNNER_TEMP\/ki021-giss\.json"/);
  assert.match(yaml, /"\$RUNNER_TEMP\/ki021-secret-policy\.json"/);
});

test('KI-021 diagnostics remain redacted when Google Cloud denies IAM access or billing', async () => {
  const yaml = await fs.readFile(workflowPath, 'utf8');
  assert.match(yaml, /BLOCKED_GCP_BILLING/);
  assert.match(yaml, /BLOCKED_IAM_PERMISSION/);
  assert.match(yaml, /BLOCKED_POLICY_UNAVAILABLE/);
  assert.match(yaml, /2> "\$RUNNER_TEMP\/ki021-iam-error\.txt"/);
  assert.doesNotMatch(yaml, /cat "\$RUNNER_TEMP\/ki021-iam-error\.txt"/);
  assert.doesNotMatch(yaml, /echo.*\$GCP_CLOUD_RUN_SERVICE_ACCOUNT/);
  assert.match(yaml, /NOT certified/);
});
