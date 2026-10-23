// KI-019: non-secret readiness report. This is a separate, fail-closed
// evidence gate; hashes or a self-declared "verified" status are not proof.
import { createHash } from 'node:crypto';

export const REQUIRED_KNOWINDEX_PROOFS = Object.freeze({
  cloudRunIssuerAndIam: 'protected-github-run',
  liveContributorIdentity: 'authorized-identity-review',
  independentCuratorRole: 'authorized-identity-review',
  dedicatedDatabaseOwnership: 'approved-storage-review',
  offHostBackupRestore: 'independent-restore-attestation',
  emergencyDisableDrill: 'deployment-disable-drill'
});

const SHA = /^[a-f0-9]{64}$/;
const safeUrl = value => {
  if (typeof value !== 'string' || value.length > 1000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.search && !url.hash && url.hostname === 'github.com';
  } catch { return false; }
};
const reject = reason => ({ gate: 'KI-019', status: 'BLOCKED', productionWritesApproved: false, reason });
const asTime = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) return NaN;
  return Date.parse(value);
};

export function assessKnowindexEvidence(manifest, {
  now = () => new Date(),
  maxEvidenceAgeHours = 168,
  approvedIssuers = []
} = {}) {
  try {
    if (!manifest || manifest.schemaVersion !== 1 ||
        manifest.gate !== 'KI-019' || manifest.productionWritesApproved !== false ||
        typeof manifest.createdAt !== 'string') return reject('manifest_invalid');
    const current = new Date(now()).getTime();
    if (!Number.isFinite(current) || !Number.isFinite(asTime(manifest.createdAt)) ||
        asTime(manifest.createdAt) > current + 30000) return reject('clock_or_manifest_invalid');
    const proofs = manifest.proofs;
    if (!proofs || typeof proofs !== 'object' || Array.isArray(proofs)) return reject('proofs_missing');
    const verified = [], blockers = [], refs = new Set();
    for (const [name, expectedType] of Object.entries(REQUIRED_KNOWINDEX_PROOFS)) {
      const entry = proofs[name];
      if (!entry || entry.state !== 'verified') {
        blockers.push(name + ':unverified');
        continue;
      }
      if (entry.type !== expectedType || !SHA.test(entry.sha256 || '') ||
          entry.sha256 === '0'.repeat(64) ||
          !Number.isFinite(asTime(entry.observedAt)) ||
          asTime(entry.observedAt) > current + 30000 ||
          current - asTime(entry.observedAt) > maxEvidenceAgeHours * 3600000 ||
          !safeUrl(entry.evidenceUrl) ||
          refs.has(entry.evidenceUrl) ||
          !approvedIssuers.includes(entry.attestedBy)) {
        blockers.push(name + ':invalid_or_stale_evidence');
        continue;
      }
      refs.add(entry.evidenceUrl);
      verified.push(name);
    }
    const extra = Object.keys(proofs).filter(k => !(k in REQUIRED_KNOWINDEX_PROOFS));
    if (extra.length) blockers.push('unknown_proof_types');
    const roles = manifest.separation;
    if (!roles || roles.independentApproversConfirmed !== true ||
        roles.contributorAndCuratorDistinct !== true ||
        roles.actualRuntimeCredentialsChecked !== true ||
        roles.productionDatabaseBackupRestored !== true ||
        roles.billingChangeApprovedOrNotRequired !== true) blockers.push('independent_operator_certification_pending');

    const database = manifest.storage;
    if (!database || database.workstream !== 'knowindex' ||
        database.dedicatedPersistent === true && database.offHostRestoreVerified !== true ||
        database.dedicatedPersistent !== true ||
        database.roleLeastPrivilegeVerified !== true) blockers.push('dedicated_production_storage_unverified');

    // This report is never itself a signed activation or an authorization to
    // switch on writes. Operators must still use KI-018 Ed25519 dual signatures,
    // matching deployment SHA, active member registry, and runtime PG checks.
    return {
      gate: 'KI-019',
      status: blockers.length ? 'BLOCKED' : 'EVIDENCE_REVIEW_COMPLETE',
      productionWritesApproved: false,
      verifiedEvidenceTypes: verified,
      blockers,
      nextAction: blockers.length
        ? 'Obtain externally reviewed production identity and dedicated backed-up storage evidence'
        : 'Request separately signed KI-018, one-record, four-hour production pilot authorization'
    };
  } catch {
    return reject('evidence_assessment_unavailable');
  }
}
