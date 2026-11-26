/**
 * NEO Chords Gate 2: non-executing bridge from operator language to gate proposals.
 * Canonical meanings live in src/noology/neotericMethod.ts, not in this module.
 * This module does not authenticate callers, persist, advance gates or run workers.
 * The caller MUST supply a verified principal from an independent auth layer.
 */
import { createHash } from 'node:crypto';

const ORDER_VERBS = new Set(['MOTION', 'POSTPONE', 'AMEND', 'COMMIT', 'QUESTION', 'TABLE', 'ADJOURN']);
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function assertString(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${field}_required`);
}
function parseOrder(utterance) {
  assertString(utterance, 'utterance');
  if (utterance.length > 4000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(utterance))
    throw new TypeError('utterance_invalid');
  const text = utterance.trim().normalize('NFKC');
  // Exact utterance or a phrase clearly separated by punctuation at the end.
  // A reference such as "explain next gate" or "what does next gate mean?" does not match.
  const advancement = /(?:^|[.!?,;]\s*)next\s+gate\s*[.!?]*$/iu.exec(text);
  if (advancement) {
    return Object.freeze({ verb: 'NEXT_GATE', context: text.slice(0, advancement.index).trim(), text });
  }
  const m = /^(?:noocratic\s+)?(motion|postpone|amend|commit|question|table|adjourn)(?::\s*|\s+)([\s\S]*)$/iu.exec(text);
  if (!m || !ORDER_VERBS.has(m[1].toUpperCase())) return null;
  const detail = m[2].trim();
  if (!detail) return null;
  return Object.freeze({ verb: m[1].toUpperCase(), detail, text });
}

/** Returns an inert, attributable proposal. No execution side effects. */
export function proposeGateOrder({ utterance, principal, gate, expectedRevision, source = 'operator_voice' } = {}) {
  if (!['operator_voice', 'operator_text'].includes(source)) throw new TypeError('untrusted_order_source');
  if (!principal || principal.verified !== true || typeof principal.subjectId !== 'string' || !ID_PATTERN.test(principal.subjectId)
      || !Array.isArray(principal.scopes) || !principal.scopes.includes('chords.gate.propose'))
    throw new Error('verified_operator_scope_required');
  if (!gate || typeof gate.id !== 'string' || !ID_PATTERN.test(gate.id)
      || !Number.isSafeInteger(gate.revision) || gate.revision < 0)
    throw new TypeError('valid_gate_required');
  if (expectedRevision !== gate.revision) throw new Error('stale_gate_revision');
  const parsed = parseOrder(utterance);
  if (!parsed) return Object.freeze({ status: 'UNRECOGNIZED', executes: false, gateId: gate.id });
  if (parsed.verb === 'NEXT_GATE' && (!gate.next || typeof gate.next.id !== 'string' || !ID_PATTERN.test(gate.next.id))) {
    return Object.freeze({ status: 'BLOCKED', reason: 'next_gate_not_defined', executes: false, gateId: gate.id });
  }
  if (gate.closed === true && parsed.verb !== 'QUESTION') {
    return Object.freeze({ status: 'BLOCKED', reason: 'gate_closed', executes: false, gateId: gate.id });
  }
  const id = createHash('sha256').update(JSON.stringify({
    actor: principal.subjectId, gateId: gate.id, revision: gate.revision,
    verb: parsed.verb, utterance: parsed.text
  })).digest('hex').slice(0, 32);
  const nextGateId = parsed.verb === 'NEXT_GATE' ? gate.next.id : null;
  const escalationRequired = parsed.verb === 'NEXT_GATE' && gate.next?.approvalClass !== 'A';
  return Object.freeze({
    status: 'PROPOSED',
    orderId: id,
    verb: parsed.verb,
    source,
    principal: principal.subjectId,
    gateId: gate.id,
    expectedRevision: gate.revision,
    nextGateId,
    escalationRequired,
    authority: 'proposal_only',
    executes: false
  });
}

export { parseOrder, ORDER_VERBS };
