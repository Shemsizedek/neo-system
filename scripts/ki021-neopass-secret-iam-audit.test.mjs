import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { extractGissIamTarget, inspectGissSecretIamPolicy } from './ki021-neopass-secret-iam-audit.mjs';

const PROJECT = 'holytemples-project';
const SECRET = 'neo-pass-jwt-secret';
const PRINCIPAL = 'giss-runtime@holytemples-project.iam.gserviceaccount.com';
const OTHER = 'other-runtime@holytemples-project.iam.gserviceaccount.com';
const secretBinding = {
  name: 'NEO_PASS_JWT_SECRET',
  valueFrom: { secretKeyRef: { name: SECRET, key: 'latest' } }
};
const oauthBinding = { name: 'GOOGLE_OAUTH_CLIENT_ID', value: 'sensitive-client-id.apps.googleusercontent.com' };
const issuerBinding = { name: 'NEO_PASS_JWT_ISSUER', value: 'neo-pass' };
const cloudRun = (env = [secretBinding, oauthBinding, issuerBinding], overrides = {}) => ({
  metadata: { name: 'neo-temple-giss', namespace: PROJECT },
  spec: { template: { spec: { serviceAccountName: PRINCIPAL, containers: [{ env }] } } },
  ...overrides
});
const policy = (bindings = [{
  role: 'roles/secretmanager.secretAccessor', members: ['serviceAccount:' + PRINCIPAL]
}]) => ({ version: 1, bindings });
const inspect = (service = cloudRun(), iamPolicy = policy()) =>
  inspectGissSecretIamPolicy({ service, policy: iamPolicy, projectId: PROJECT });

test('KI-021 verifies direct unconditional Secret Manager IAM grant without exposing identities', () => {
  const result = inspect();
  assert.equal(result.status, 'DIRECT_IAM_BINDING_OBSERVED_ONLY');
  assert.equal(result.secretBindingAndDirectGrantObserved, true);
  assert.equal(result.metadataReady, true);
  assert.equal(result.issuerConfigured, true);
  assert.equal(result.directUnconditionalSecretAccessorGrantObserved, true);
  assert.equal(result.actualEffectiveRuntimeSecretAccessVerified, false);
  assert.equal(result.actualTokenIssuedAndVerified, false);
  assert.equal(result.realContributorAndCuratorVerified, false);
  assert.equal(result.productionBackupAndRestoreVerified, false);
  assert.equal(result.productionWritesApproved, false);
  const output = JSON.stringify(result);
  for (const privateText of [PROJECT, SECRET, PRINCIPAL, OTHER, 'sensitive-client-id']) {
    assert.equal(output.includes(privateText), false, 'principal, secret name, or client ID leaked');
  }
});

test('KI-021 missing issuer fails even with direct secretAccessor IAM', () => {
  const result = inspect(cloudRun([secretBinding, oauthBinding]));
  assert.equal(result.issuerConfigured, false);
  assert.equal(result.metadataReady, false);
  assert.equal(result.secretBindingAndDirectGrantObserved, false);
  assert.equal(result.status, 'BLOCKED');
});

test('KI-021 refuses unexpected issuer values and unverifiable issuer secret references', () => {
  const wrong = cloudRun([
    secretBinding, oauthBinding, { name: 'NEO_PASS_JWT_ISSUER', value: 'untrusted-issuer' }
  ]);
  const other = inspect(wrong);
  assert.equal(other.issuerConfigured, true);
  assert.equal(other.issuerMatchesNEOpassContract, false);
  assert.equal(other.status, 'BLOCKED');

  const hidden = cloudRun([
    secretBinding, oauthBinding,
    { name: 'NEO_PASS_JWT_ISSUER', valueFrom: { secretKeyRef: { name: 'private-issuer', key: 'latest' } } }
  ]);
  assert.equal(inspect(hidden).status, 'BLOCKED');
  const duplicate = cloudRun([secretBinding, oauthBinding, issuerBinding, issuerBinding]);
  assert.equal(inspect(duplicate).status, 'BLOCKED');
});

test('KI-021 never accepts a conditional grant as verified unconditional access', () => {
  const result = inspect(cloudRun(), policy([{
    role: 'roles/secretmanager.secretAccessor',
    members: ['serviceAccount:' + PRINCIPAL],
    condition: { title: 'short-lived-grant', expression: "request.time < timestamp('2026-11-01T00:00:00Z')" }
  }]));
  assert.equal(result.directUnconditionalSecretAccessorGrantObserved, false);
  assert.equal(result.conditionalSecretAccessorGrantObserved, true);
  assert.equal(result.status, 'BLOCKED');
});

test('KI-021 rejects access granted only to unrelated principal or group', () => {
  for (const members of [
    ['serviceAccount:' + OTHER],
    ['group:all-operators@example.org'],
    ['allUsers'],
    []
  ]) {
    const result = inspect(cloudRun(), policy([{
      role: 'roles/secretmanager.secretAccessor', members
    }]));
    assert.equal(result.directUnconditionalSecretAccessorGrantObserved, false);
    assert.equal(result.status, 'BLOCKED');
  }
});

test('KI-021 detects overprivileged secret policy even with direct accessor grant', () => {
  const broad = policy([
    { role: 'roles/secretmanager.secretAccessor', members: ['serviceAccount:' + PRINCIPAL] },
    { role: 'roles/secretmanager.admin', members: ['serviceAccount:' + PRINCIPAL] }
  ]);
  const result = inspect(cloudRun(), broad);
  assert.equal(result.directUnconditionalSecretAccessorGrantObserved, true);
  assert.equal(result.overprivilegedSecretRoleObserved, true);
  assert.equal(result.secretBindingAndDirectGrantObserved, false);
  assert.equal(result.status, 'BLOCKED');
});

test('KI-021 empty, unreadable, or malformed policy is blocked', () => {
  for (const candidate of [undefined, null, {}, [], { bindings: null }, { bindings: [] }]) {
    assert.equal(inspectGissSecretIamPolicy({ service: cloudRun(), policy: candidate, projectId: PROJECT }).status, 'BLOCKED');
  }
});

test('KI-021 rejects literal signing key, missing key version, duplicate key bindings', () => {
  const literal = cloudRun([
    { name: 'NEO_PASS_JWT_SECRET', value: 'sensitive-literal-never-print' },
    oauthBinding, issuerBinding
  ]);
  assert.equal(inspect(literal).status, 'BLOCKED');
  const missingVersion = cloudRun([
    { name: 'NEO_PASS_JWT_SECRET', valueFrom: { secretKeyRef: { name: SECRET } } },
    oauthBinding, issuerBinding
  ]);
  assert.equal(inspect(missingVersion).status, 'BLOCKED');
  const duplicated = cloudRun([secretBinding, secretBinding, oauthBinding, issuerBinding]);
  assert.equal(extractGissIamTarget(duplicated, { projectId: PROJECT }), null);
  assert.equal(inspect(duplicated).status, 'BLOCKED');
});

test('KI-021 blocks service-account substitution or a different Cloud Run service', () => {
  const otherAccount = cloudRun();
  otherAccount.spec.template.spec.serviceAccountName = OTHER;
  assert.equal(inspect(otherAccount).status, 'BLOCKED');
  assert.equal(inspect(cloudRun(undefined, { metadata: { name: 'unapproved-giss' } })).status, 'BLOCKED');
  const defaultAccount = cloudRun();
  defaultAccount.spec.template.spec.serviceAccountName = '123456-compute@developer.gserviceaccount.com';
  assert.equal(inspect(defaultAccount).status, 'BLOCKED');
});

test('KI-021 refuses cross-project secret binding and invalid project ID', () => {
  const foreign = cloudRun([
    { name: 'NEO_PASS_JWT_SECRET',
      valueFrom: { secretKeyRef: { name: 'projects/other-project/secrets/neo-pass-jwt-secret', key: 'latest' } } },
    oauthBinding, issuerBinding
  ]);
  assert.equal(inspect(foreign).status, 'BLOCKED');
  assert.equal(extractGissIamTarget(cloudRun(), { projectId: 'evil;rm' }), null);
  assert.equal(inspectGissSecretIamPolicy({ service: cloudRun(), policy: policy(), projectId: 'other-project' }).status, 'BLOCKED');
});

test('KI-021 accepts numeric Cloud Run namespaces without inferring the project ID', () => {
  const service = cloudRun();
  service.metadata.namespace = '123456789012';
  const result = inspect(service);
  assert.equal(result.secretBindingAndDirectGrantObserved, true);
  assert.equal(result.actualEffectiveRuntimeSecretAccessVerified, false);
});

test('KI-021 accepts well-formed Cloud Run v2 secret references without treating them as live access', () => {
  const service = {
    name: 'neo-temple-giss',
    template: {
      serviceAccount: PRINCIPAL,
      containers: [{ env: [
        { name: 'NEO_PASS_JWT_SECRET', valueSource: { secretKeyRef: { secret: SECRET, version: 'latest' } } },
        oauthBinding, issuerBinding
      ] }]
    }
  };
  const result = inspect(service);
  assert.equal(result.secretBindingAndDirectGrantObserved, true);
  assert.equal(result.actualEffectiveRuntimeSecretAccessVerified, false);
});

test('KI-021 command-line ref extraction uses private runner file and never prints secret names', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-ki021-'));
  const serviceFile = path.join(dir, 'giss.json');
  const policyFile = path.join(dir, 'policy.json');
  const refFile = path.join(dir, 'secret-ref');
  try {
    await fs.writeFile(serviceFile, JSON.stringify(cloudRun()));
    await fs.writeFile(policyFile, JSON.stringify(policy()));
    const env = { ...process.env, GCP_PROJECT_ID: PROJECT, RUNNER_TEMP: dir };
    const extract = spawnSync(process.execPath,
      ['scripts/ki021-neopass-secret-iam-audit.mjs', 'extract-ref', serviceFile, refFile],
      { env, encoding: 'utf8' });
    assert.equal(extract.status, 0, extract.stderr);
    assert.equal((await fs.readFile(refFile, 'utf8')).trim(), SECRET);
    assert.equal((await fs.stat(refFile)).mode & 0o777, 0o600);
    assert.equal(extract.stdout.includes(SECRET), false);
    assert.equal(extract.stdout.includes(PRINCIPAL), false);
    const evaluate = spawnSync(process.execPath,
      ['scripts/ki021-neopass-secret-iam-audit.mjs', 'evaluate', serviceFile, policyFile],
      { env, encoding: 'utf8' });
    assert.equal(evaluate.status, 0, evaluate.stderr);
    assert.equal(JSON.parse(evaluate.stdout).secretBindingAndDirectGrantObserved, true);
    assert.equal(evaluate.stdout.includes(PRINCIPAL), false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('KI-021 command-line fails closed if a private ref would escape runner temp', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-ki021-'));
  try {
    const serviceFile = path.join(dir, 'giss.json');
    await fs.writeFile(serviceFile, JSON.stringify(cloudRun()));
    const env = { ...process.env, GCP_PROJECT_ID: PROJECT, RUNNER_TEMP: dir };
    const result = spawnSync(process.execPath,
      ['scripts/ki021-neopass-secret-iam-audit.mjs', 'extract-ref', serviceFile, path.join(dir, '..', 'public.log')],
      { env, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.equal(result.stderr.includes(SECRET), false);
    assert.equal(result.stderr.includes(PRINCIPAL), false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
