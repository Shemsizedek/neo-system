import test from 'node:test';
import assert from 'node:assert/strict';
import { NiaCore } from './core.mjs';

const analyst = { id: 'analyst-1', role: 'analyst', clearance: 'RESTRICTED' };
const reviewer = { id: 'reviewer-1', role: 'reviewer', clearance: 'RESTRICTED' };
const outsider = { id: 'outsider', role: 'analyst', clearance: 'PUBLIC' };

test('case → source → evidence → claim → versioned assessment and audit', () => {
  const nia = new NiaCore();
  const c = nia.registerCase(analyst, { title: 'Synthetic test case', handling: 'RESTRICTED' });
  const s = nia.registerSource(analyst, { locator: 'synthetic://source', caseId: c.id });
  const e = nia.registerEvidence(analyst, { sourceId: s.id, content: 'original bytes' });
  assert.equal(nia.registerEvidence(analyst, { sourceId: s.id, content: 'original bytes' }).id, e.id);
  assert.equal(nia.verifyEvidence(analyst, e.id, 'original bytes'), true);
  assert.equal(nia.verifyEvidence(analyst, e.id, 'altered bytes'), false);
  const claim = nia.createClaim(analyst, { caseId: c.id, statement: 'Test claim', evidenceIds: [e.id] });
  assert.equal(claim.status, 'UNVERIFIED');
  assert.throws(() => nia.assessClaim(analyst, { claimId: claim.id, confidence: 'LOW', rationale: 'Review' }), /Reviewer required/);
  assert.throws(() => nia.verifyEvidence(outsider, e.id, 'original bytes'), /Insufficient clearance/);
  const a1 = nia.assessClaim(reviewer, { claimId: claim.id, confidence: 'LOW', rationale: 'Not corroborated', contradictingEvidenceIds: [e.id] });
  const a2 = nia.assessClaim(reviewer, { claimId: claim.id, confidence: 'INSUFFICIENT_EVIDENCE', rationale: 'Correction' });
  assert.equal(a2.previousId, a1.id);
  assert.equal(nia.assessments(reviewer, claim.id).length, 2);
  assert.equal(nia.verifyAuditChain(), true);
  assert.ok(nia.audit(reviewer).some(x => x.action === 'ACCESS_OR_OPERATION_DENIED'));
});
