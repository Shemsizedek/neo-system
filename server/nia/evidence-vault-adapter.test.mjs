import test from 'node:test';
import assert from 'node:assert/strict';
import { createNiaEvidenceVaultAdapter } from './evidence-vault-adapter.mjs';

test('N.I.A. evidence ID stays stable in existing SQLite Vault', () => {
  const actor = { id: 'analyst', role: 'analyst', clearance: 'RESTRICTED' };
  const reviewer = { id: 'reviewer', role: 'reviewer', clearance: 'RESTRICTED' };
  const adapter = createNiaEvidenceVaultAdapter();
  try {
    const c = adapter.core.registerCase(actor, { title: 'Synthetic', handling: 'RESTRICTED' });
    const s = adapter.core.registerSource(actor, { locator: 'synthetic://one', caseId: c.id });
    const e = adapter.register({ actor, caseId: c.id, sourceId: s.id, content: 'sample', title: 'Sample' });
    assert.equal(e.id, e.vaultId);
    assert.equal(adapter.getVaultRecord(e.id).id, e.id);
    assert.equal(adapter.verify({ actor, evidenceId: e.id, content: 'sample' }).valid, true);
    assert.equal(adapter.verify({ actor, evidenceId: e.id, content: 'changed' }).valid, false);
    assert.equal(adapter.register({ actor, caseId: c.id, sourceId: s.id, content: 'sample', title: 'Sample' }).id, e.id);
    assert.throws(() => adapter.review({ actor, evidenceId: e.id, status: 'ACCEPTED' }), /reviewer required/);
    assert.equal(adapter.review({ actor: reviewer, evidenceId: e.id, status: 'CONFLICTED' }).reviewStatus, 'CONFLICTED');
    assert.ok(adapter.listVaultAudit(c.id).length >= 2);
  } finally { adapter.close(); }
});
