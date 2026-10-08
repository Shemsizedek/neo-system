import { createHash, randomUUID } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const ROLES = Object.freeze(['analyst', 'reviewer', 'administrator']);
export const HANDLING = Object.freeze(['PUBLIC', 'NEO_INTERNAL', 'RESTRICTED', 'CASE_CONTROLLED', 'PRIVILEGED_PROTECTED']);
const levels = new Map(HANDLING.map((x, i) => [x, i]));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const required = (value, label) => assert(typeof value === 'string' && value.trim().length > 0, label + ' required');
const clone = value => structuredClone(value);

export class NiaCore {
  #cases = new Map();
  #sources = new Map();
  #evidence = new Map();
  #claims = new Map();
  #assessments = new Map();
  #audit = [];
  #auditTail = 'GENESIS';

  #authorize(actor, handling = 'NEO_INTERNAL', action = 'read') {
    assert(actor && ROLES.includes(actor.role), 'Unauthorized role');
    assert(HANDLING.includes(handling), 'Invalid handling');
    assert(HANDLING.includes(actor.clearance), 'Invalid clearance');
    assert(levels.get(actor.clearance) >= levels.get(handling), 'Insufficient clearance');
    if (action === 'assess') assert(['reviewer', 'administrator'].includes(actor.role), 'Reviewer required');
  }
  #record(actor, action, objectId, detail = {}) {
    const entry = { id: randomUUID(), at: new Date().toISOString(), actor: actor?.id ?? 'UNKNOWN', action, objectId, detail: clone(detail), previousHash: this.#auditTail };
    entry.hash = sha256(JSON.stringify(entry));
    this.#auditTail = entry.hash;
    this.#audit.push(Object.freeze(entry));
  }
  #perform(actor, handling, action, callback) {
    try { this.#authorize(actor, handling, action); return callback(); }
    catch (error) { this.#record(actor, 'ACCESS_OR_OPERATION_DENIED', null, { action, reason: error.message }); throw error; }
  }
  registerCase(actor, { title, handling = 'NEO_INTERNAL' }) {
    return this.#perform(actor, handling, 'write', () => {
      required(title, 'title');
      const item = Object.freeze({ id: randomUUID(), title, handling, createdAt: new Date().toISOString() });
      this.#cases.set(item.id, item); this.#record(actor, 'CASE_CREATED', item.id); return clone(item);
    });
  }
  registerSource(actor, { locator, caseId }) {
    const c = this.#cases.get(caseId); assert(c, 'Case not found');
    return this.#perform(actor, c.handling, 'write', () => {
      required(locator, 'locator');
      const item = Object.freeze({ id: randomUUID(), locator, caseId });
      this.#sources.set(item.id, item); this.#record(actor, 'SOURCE_REGISTERED', item.id); return clone(item);
    });
  }
  registerEvidence(actor, { sourceId, content, derivedFrom = null }) {
    const source = this.#sources.get(sourceId); assert(source, 'Source not found');
    const c = this.#cases.get(source.caseId);
    return this.#perform(actor, c.handling, 'write', () => {
      assert(typeof content === 'string' || Buffer.isBuffer(content), 'Content must be text or Buffer');
      if (derivedFrom !== null) assert(this.#evidence.has(derivedFrom), 'Parent evidence not found');
      const digest = sha256(content);
      const existing = [...this.#evidence.values()].find(x => x.sourceId === sourceId && x.digest === digest && x.derivedFrom === derivedFrom);
      if (existing) { this.#record(actor, 'EVIDENCE_DUPLICATE', existing.id); return clone(existing); }
      const item = Object.freeze({ id: randomUUID(), sourceId, caseId: source.caseId, digest, derivedFrom, createdAt: new Date().toISOString() });
      this.#evidence.set(item.id, item); this.#record(actor, 'EVIDENCE_REGISTERED', item.id, { digest }); return clone(item);
    });
  }
  verifyEvidence(actor, evidenceId, content) {
    const item = this.#evidence.get(evidenceId); assert(item, 'Evidence not found');
    const c = this.#cases.get(item.caseId);
    return this.#perform(actor, c.handling, 'read', () => {
      const valid = sha256(content) === item.digest;
      this.#record(actor, 'EVIDENCE_VERIFIED', item.id, { valid }); return valid;
    });
  }
  createClaim(actor, { caseId, statement, evidenceIds = [] }) {
    const c = this.#cases.get(caseId); assert(c, 'Case not found');
    return this.#perform(actor, c.handling, 'write', () => {
      required(statement, 'statement');
      assert(Array.isArray(evidenceIds) && evidenceIds.every(id => this.#evidence.get(id)?.caseId === caseId), 'Evidence must belong to case');
      const item = Object.freeze({ id: randomUUID(), caseId, statement, evidenceIds: Object.freeze([...new Set(evidenceIds)]), status: 'UNVERIFIED' });
      this.#claims.set(item.id, item); this.#record(actor, 'CLAIM_CREATED', item.id); return clone(item);
    });
  }
  assessClaim(actor, { claimId, confidence, rationale, contradictingEvidenceIds = [] }) {
    const claim = this.#claims.get(claimId); assert(claim, 'Claim not found');
    const c = this.#cases.get(claim.caseId);
    return this.#perform(actor, c.handling, 'assess', () => {
      assert(['HIGH', 'MODERATE', 'LOW', 'INSUFFICIENT_EVIDENCE'].includes(confidence), 'Invalid confidence');
      required(rationale, 'rationale');
      assert(Array.isArray(contradictingEvidenceIds) && contradictingEvidenceIds.every(id => this.#evidence.get(id)?.caseId === claim.caseId), 'Contradicting evidence must belong to case');
      const history = this.#assessments.get(claimId) ?? [];
      const item = Object.freeze({ id: randomUUID(), claimId, version: history.length + 1, confidence, rationale, contradictingEvidenceIds: Object.freeze([...new Set(contradictingEvidenceIds)]), previousId: history.at(-1)?.id ?? null, createdAt: new Date().toISOString() });
      history.push(item); this.#assessments.set(claimId, history); this.#record(actor, 'CLAIM_ASSESSED', item.id, { claimId, version: item.version }); return clone(item);
    });
  }
  assessments(actor, claimId) {
    const claim = this.#claims.get(claimId); assert(claim, 'Claim not found');
    return this.#perform(actor, this.#cases.get(claim.caseId).handling, 'read', () => clone(this.#assessments.get(claimId) ?? []));
  }
  audit(actor) {
    return this.#perform(actor, 'RESTRICTED', 'read', () => clone(this.#audit));
  }
  verifyAuditChain() {
    let previous = 'GENESIS';
    return this.#audit.every(item => {
      const { hash, ...payload } = item;
      const valid = item.previousHash === previous && sha256(JSON.stringify(payload)) === hash;
      previous = hash; return valid;
    });
  }
}
