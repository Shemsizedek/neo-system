// KI-020 inventory screening only. No database connection, provisioning,
// migration, billing, permission, write-enable, or publication side effect.
const OWNERS = new Set(['knowindex']);
const PROVIDERS = new Set(['render', 'neon']);
const SHA = /^[a-f0-9]{64}$/;

export function screenKnowindexStorageInventory(inventory) {
  if (!inventory || inventory.schemaVersion !== 1 || inventory.gate !== 'KI-020' ||
      inventory.productionWritesApproved !== false ||
      inventory.selectedProductionDatabase !== null ||
      !Array.isArray(inventory.candidates)) {
    return Object.freeze({ status: 'BLOCKED', reason: 'invalid_or_authorized_inventory', productionWritesApproved: false });
  }
  const labels = new Set(), eligible = [], blockers = [];
  for (const candidate of inventory.candidates) {
    if (!candidate || !PROVIDERS.has(candidate.provider) ||
        typeof candidate.name !== 'string' || !/^[a-z0-9-]{4,100}$/.test(candidate.name) ||
        labels.has(candidate.provider + ':' + candidate.name)) {
      return Object.freeze({ status: 'BLOCKED', reason: 'invalid_or_duplicate_candidate', productionWritesApproved: false });
    }
    labels.add(candidate.provider + ':' + candidate.name);
    if (candidate.productionEligible !== true ||
        !OWNERS.has(candidate.workstream) ||
        candidate.environment !== 'production' ||
        candidate.operatorApprovalVerified !== true ||
        candidate.securityApprovalVerified !== true ||
        candidate.isolatedDatabaseVerified !== true ||
        candidate.leastPrivilegeVerified !== true ||
        candidate.offHostBackupVerified !== true ||
        candidate.independentRestoreVerified !== true ||
        !SHA.test(candidate.backupEvidenceSha256 || '') ||
        candidate.backupEvidenceSha256 === '0'.repeat(64)) {
      blockers.push(candidate.provider + ':' + candidate.name + ':not_certified');
    } else {
      // This is a screening report, not permission to run writes.
      eligible.push(candidate.provider + ':' + candidate.name);
    }
  }
  if (inventory.candidates.length === 0) blockers.push('no_inventory');
  if (eligible.length !== 1) blockers.push('exactly_one_isolated_candidate_required');
  return Object.freeze({
    gate: 'KI-020',
    status: blockers.length ? 'BLOCKED' : 'CANDIDATE_REVIEW_COMPLETE',
    productionWritesApproved: false,
    eligibleCandidateCount: eligible.length,
    blockers,
    nextAction: blockers.length
      ? 'Obtain explicit isolated database and backup certification without borrowing another workstream storage'
      : 'Separately verify approved live identity, GCP IAM and dual KI-018 signed authorization'
  });
}
