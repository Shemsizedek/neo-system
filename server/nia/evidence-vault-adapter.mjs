import { createEvidenceVault } from '../neo-evidence-vault/store.mjs';
import { NiaCore } from './core.mjs';

// Development-only adapter. Uses existing Vault record IDs as canonical N.I.A. evidence IDs.
// Do not expose this adapter through the legacy unauthenticated Vault HTTP handler.
export function createNiaEvidenceVaultAdapter({ path = ':memory:', core = new NiaCore() } = {}) {
  const vault = createEvidenceVault(path);
  const links = new Map();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  function register({ actor, caseId, sourceId, content, title, sourceType = 'NIA_SOURCE', sourceUrl, derivedFrom = null }) {
    assert(actor?.id && ['analyst', 'reviewer', 'administrator'].includes(actor.role), 'authenticated actor required');
    assert(typeof title === 'string' && title.trim(), 'title required');
    assert(typeof content === 'string' || Buffer.isBuffer(content), 'content required');
    // Core enforces case clearance and source membership. No raw evidence bytes enter the Vault.
    const evidence = core.registerEvidence(actor, { sourceId, content, derivedFrom });
    const prior = links.get(evidence.id);
    if (prior) return { ...evidence, vaultId: prior };
    const record = vault.createEvidence({
      id: evidence.id,
      asset: 'NIA:' + caseId,
      title,
      sourceType,
      sourceUrl,
      note: JSON.stringify({ sha256: evidence.digest, sourceId, derivedFrom, handling: 'CASE_CONTROLLED' })
    }, actor.id);
    links.set(evidence.id, record.id);
    return { ...evidence, vaultId: record.id };
  }

  function verify({ actor, evidenceId, content }) {
    const valid = core.verifyEvidence(actor, evidenceId, content);
    assert(links.has(evidenceId), 'Vault evidence record not linked');
    return { evidenceId, vaultId: links.get(evidenceId), valid };
  }

  function review({ actor, evidenceId, status, note }) {
    assert(actor?.id && ['reviewer', 'administrator'].includes(actor.role), 'reviewer required');
    assert(links.has(evidenceId), 'Vault evidence record not linked');
    return vault.reviewEvidence(links.get(evidenceId), { status, reviewer: actor.id, note });
  }

  return {
    core,
    register,
    verify,
    review,
    getVaultRecord: evidenceId => vault.getEvidence(links.get(evidenceId)),
    listVaultAudit: caseId => vault.listAudit('NIA:' + caseId),
    close: () => vault.close()
  };
}
