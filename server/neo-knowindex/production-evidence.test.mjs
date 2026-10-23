import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assessKnowindexEvidence, REQUIRED_KNOWINDEX_PROOFS } from './production-evidence.mjs';

const NOW = '2026-10-23T16:00:00Z';
const now = () => new Date(NOW);
const issuer = 'security-reviewed-issuer';
const good = () => ({
  schemaVersion: 1, gate: 'KI-019', productionWritesApproved: false,
  createdAt: NOW, proofs: Object.fromEntries(Object.entries(REQUIRED_KNOWINDEX_PROOFS).map(([name, type], i) => [name, {
    state: 'verified', type, sha256: (i + 1).toString(16).repeat(64), observedAt: NOW,
    evidenceUrl: 'https://github.com/Shemsizedek/neo-system/actions/runs/' + (39900000000 + i),
    attestedBy: issuer
  }])),
  separation: {
    independentApproversConfirmed: true,
    contributorAndCuratorDistinct: true,
    actualRuntimeCredentialsChecked: true,
    productionDatabaseBackupRestored: true,
    billingChangeApprovedOrNotRequired: true
  },
  storage: {
    workstream: 'knowindex', dedicatedPersistent: true,
    offHostRestoreVerified: true, roleLeastPrivilegeVerified: true
  }
});
const assess = manifest => assessKnowindexEvidence(manifest, { now, approvedIssuers: [issuer] });

test('KI-019 repository readiness is BLOCKED until protected IAM and durable storage evidence exists', async () => {
  const manifest = JSON.parse(await fs.readFile('data/knowindex/ki019-readiness.json', 'utf8'));
  const result = assess(manifest);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.productionWritesApproved, false);
  assert.ok(result.blockers.some(x => x.includes('cloudRunIssuerAndIam')));
  assert.ok(result.blockers.some(x => x.includes('dedicated_production_storage')));
});

test('KI-019 reports evidence reviewed but NEVER produces write authorization', () => {
  const result = assess(good());
  assert.equal(result.status, 'EVIDENCE_REVIEW_COMPLETE');
  assert.equal(result.productionWritesApproved, false);
  assert.equal(result.verifiedEvidenceTypes.length, 6);
  assert.match(result.nextAction, /separately signed/);
});

test('KI-019 rejects mutable or unknown evidence sources and fake operator issuers', () => {
  const m = good();
  m.proofs.cloudRunIssuerAndIam.evidenceUrl = 'https://example.org/audit';
  m.proofs.offHostBackupRestore.attestedBy = 'self-declared';
  const result = assess(m);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('cloudRunIssuerAndIam:invalid_or_stale_evidence'));
  assert.ok(result.blockers.includes('offHostBackupRestore:invalid_or_stale_evidence'));
});

test('KI-019 stale evidence and duplicated proof URLs fail closed', () => {
  const m = good();
  m.proofs.cloudRunIssuerAndIam.observedAt = '2025-01-01T00:00:00Z';
  m.proofs.offHostBackupRestore.evidenceUrl = m.proofs.liveContributorIdentity.evidenceUrl;
  const result = assess(m);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('cloudRunIssuerAndIam:invalid_or_stale_evidence'));
  assert.ok(result.blockers.includes('offHostBackupRestore:invalid_or_stale_evidence'));
});

test('KI-019 operator signatures or verified dedicated backups are never inferred', () => {
  const m = good();
  m.separation.independentApproversConfirmed = false;
  m.storage.offHostRestoreVerified = false;
  const result = assess(m);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.blockers.includes('independent_operator_certification_pending'));
  assert.ok(result.blockers.includes('dedicated_production_storage_unverified'));
});

test('KI-019 cannot treat arbitrary public GitHub URLs as secret credentials', () => {
  const m = good();
  m.proofs.cloudRunIssuerAndIam.evidenceUrl = 'https://github.com/Shemsizedek/neo-system/actions/runs/1?token=secret';
  m.proofs.liveContributorIdentity.evidenceUrl = 'https://github.com@evil.example/steal';
  assert.equal(assess(m).status, 'BLOCKED');
});

test('KI-019 incomplete and malformed evidence never throws or authorizes', () => {
  for (const manifest of [null, {}, { schemaVersion: 1 }, { ...good(), proofs: null }, { ...good(), separation: null }]) {
    const result = assess(manifest);
    assert.equal(result.productionWritesApproved, false);
    assert.equal(result.status, 'BLOCKED');
  }
});

test('KI-019 production-approval-looking manifest is explicitly rejected', () => {
  const m = good();
  m.productionWritesApproved = true;
  assert.equal(assess(m).reason, 'manifest_invalid');
});
