import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const filename = '.github/workflows/ki022-protected-audit-receipt.yml';
const source = '.github/workflows/ki016-gcp-neopass-metadata-audit.yml';

test('KI-022 receipt is triggered by actual completion of protected production audit', async () => {
  const yaml = await fs.readFile(filename, 'utf8');
  assert.match(yaml, /workflow_run:\s*\n\s+workflows:\s*\n\s+- KI-016 NEOpass Production Signing Metadata Audit\s*\n\s+types: \[completed\]/);
  assert.match(yaml, /if: github\.event_name == 'workflow_run'/);
  assert.match(yaml, /if: github\.event_name == 'pull_request'/);
  assert.doesNotMatch(yaml, /^\s+(push|schedule|workflow_dispatch):/m);
  assert.match(yaml, /permissions:\s*\n\s+contents: read/);
});

test('KI-022 monitor never gains GCP IAM, GitHub Actions write or secret access', async () => {
  const yaml = await fs.readFile(filename, 'utf8');
  assert.doesNotMatch(yaml, /id-token: write/);
  assert.doesNotMatch(yaml, /actions: write/);
  assert.doesNotMatch(yaml, /contents: write/);
  assert.doesNotMatch(yaml, /google-github-actions\/auth/);
  assert.doesNotMatch(yaml, /gcloud secrets/);
  assert.doesNotMatch(yaml, /github\.event\.workflow_run\.actor\.login/);
  assert.doesNotMatch(yaml, /upload-artifact/);
});

test('KI-022 always checks read-only API even when protected source run fails', async () => {
  const yaml = await fs.readFile(filename, 'utf8');
  assert.match(yaml, /ki022-protected-audit-receipt\.mjs "\$GITHUB_EVENT_PATH"/);
  assert.match(yaml, /if: always\(\)/);
  assert.match(yaml, /node scripts\/ki016-live-readonly-smoke\.mjs/);
  assert.match(yaml, /production.*NOT effective runtime IAM/i);
});

test('KI-022 does not silently alter the protected source audit permission boundary', async () => {
  const yaml = await fs.readFile(source, 'utf8');
  assert.match(yaml, /^on:\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(yaml, /^\s+(push|pull_request|workflow_run|schedule):/m);
  assert.match(yaml, /environment: holytemples-production/);
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml, /gcloud secrets get-iam-policy/);
  assert.doesNotMatch(yaml, /gcloud secrets versions access/);
  assert.doesNotMatch(yaml, /gcloud secrets add-iam-policy-binding/);
});
