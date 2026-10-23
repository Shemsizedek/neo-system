import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const REVIEWERS = new Set(['curator', 'executive-admin']);
const CLASSES = new Set(['community', 'primary', 'scholarly', 'reference', 'archive', 'other']);
const RIGHTS = new Set(['original-with-permission', 'licensed', 'public-domain', 'link-only']);
const TRANSITIONS = Object.freeze({
  validate: { from: ['submitted'], to: 'validated' },
  attribute: { from: ['validated'], to: 'attributed' },
  approve: { from: ['attributed'], to: 'approved' },
  dispute: { from: ['validated', 'attributed', 'approved'], to: 'disputed' },
  reject: { from: ['submitted', 'validated', 'attributed', 'disputed'], to: 'removed' },
  remove: { from: ['approved', 'disputed'], to: 'removed' }
});
const ZERO_HASH = '0'.repeat(64);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const safeText = (value, field, max, min = 1) => {
  if (typeof value !== 'string') throw new KnowledgeWriteError('invalid_' + field);
  const clean = value.trim();
  if (clean.length < min || clean.length > max || clean.includes('\0')) throw new KnowledgeWriteError('invalid_' + field);
  return clean;
};
const eventHash = (previousHash, row) => sha256(JSON.stringify([
  previousHash, row.contributionId, row.action, row.actorSubject, row.fromState || null,
  row.toState, row.payloadJson, row.occurredAt
]));
const asIso = now => {
  const value = now();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_clock');
  return date.toISOString();
};

export class KnowledgeWriteError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.name = 'KnowledgeWriteError';
    this.code = code;
    this.status = status;
  }
}

export function normalizeContribution(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new KnowledgeWriteError('invalid_submission');
  const title = safeText(input.title, 'title', 180, 3);
  const description = safeText(input.description, 'description', 2400, 20);
  const attribution = safeText(input.attribution, 'attribution', 350, 3);
  const community = input.community == null || input.community === '' ? null : safeText(input.community, 'community', 200);
  const sourceClass = safeText(input.sourceClass, 'source_class', 32);
  if (!CLASSES.has(sourceClass)) throw new KnowledgeWriteError('invalid_source_class');
  const rightsBasis = safeText(input.rightsBasis, 'rights_basis', 48);
  if (!RIGHTS.has(rightsBasis)) throw new KnowledgeWriteError('invalid_rights_basis');
  const rightsStatement = safeText(input.rightsStatement, 'rights_statement', 700, 15);
  if (input.consentToIndex !== true) throw new KnowledgeWriteError('consent_to_index_required');
  const source = safeText(input.url, 'url', 2048);
  let url;
  try { url = new URL(source); } catch { throw new KnowledgeWriteError('invalid_url'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !url.hostname.includes('.') || /^(localhost|.*\.localhost|.*\.local|.*\.internal|0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1)/i.test(url.hostname) ||
      [...url.searchParams.keys()].some(key => /(token|key|secret|pass|auth|signature|credential|jwt|session)/i.test(key))) {
    throw new KnowledgeWriteError('unapproved_source_url');
  }
  url.hash = '';
  return { title, url: url.href, description, attribution, community, sourceClass, rightsBasis, rightsStatement, consentToIndex: true };
}

function assertActor(actor) {
  if (!actor || actor.neopassStatus !== 'active' || typeof actor.subject !== 'string' ||
      !actor.subject.trim() || actor.subject.length > 256 || typeof actor.role !== 'string') {
    throw new KnowledgeWriteError('active_verified_neopass_required', 401);
  }
  return actor.subject;
}
const reviewer = actor => REVIEWERS.has(actor.role);

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id, submittedBy: row.actor_subject, title: row.title, url: row.source_url,
    description: row.description, attribution: row.attribution, community: row.community,
    sourceClass: row.source_class, rightsBasis: row.rights_basis, rightsStatement: row.rights_statement,
    state: row.state, version: row.version, payloadSha256: row.payload_sha256,
    createdAt: row.created_at, updatedAt: row.updated_at, indexPublished: false
  };
}

export function createKnowindexContributionLedger({ file = ':memory:', now = () => new Date(), maxSubmissionsPerHour = 5 } = {}) {
  if (!Number.isInteger(maxSubmissionsPerHour) || maxSubmissionsPerHour < 1 || maxSubmissionsPerHour > 100) throw new Error('invalid_rate_limit');
  const db = new DatabaseSync(file);
  db.exec([
    'PRAGMA foreign_keys=ON;',
    'CREATE TABLE IF NOT EXISTS knowindex_contributions (id TEXT PRIMARY KEY, actor_subject TEXT NOT NULL, request_key TEXT NOT NULL, title TEXT NOT NULL, source_url TEXT NOT NULL, description TEXT NOT NULL, attribution TEXT NOT NULL, community TEXT, source_class TEXT NOT NULL, rights_basis TEXT NOT NULL, rights_statement TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN (\'submitted\',\'validated\',\'attributed\',\'approved\',\'disputed\',\'removed\')), version INTEGER NOT NULL, payload_sha256 TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(actor_subject, request_key));',
    'CREATE INDEX IF NOT EXISTS idx_knowindex_owner_time ON knowindex_contributions(actor_subject,created_at);',
    'CREATE INDEX IF NOT EXISTS idx_knowindex_state_time ON knowindex_contributions(state,created_at);',
    'CREATE TABLE IF NOT EXISTS knowindex_events (seq INTEGER PRIMARY KEY AUTOINCREMENT, contribution_id TEXT NOT NULL REFERENCES knowindex_contributions(id), action TEXT NOT NULL, actor_subject TEXT NOT NULL, from_state TEXT, to_state TEXT NOT NULL, payload_json TEXT NOT NULL, previous_hash TEXT NOT NULL, event_hash TEXT NOT NULL, occurred_at TEXT NOT NULL);',
    "CREATE TRIGGER IF NOT EXISTS knowindex_audit_no_update BEFORE UPDATE ON knowindex_events BEGIN SELECT RAISE(ABORT, 'append_only_audit'); END;",
    "CREATE TRIGGER IF NOT EXISTS knowindex_audit_no_delete BEFORE DELETE ON knowindex_events BEGIN SELECT RAISE(ABORT, 'append_only_audit'); END;"
  ].join('\n'));

  const getRaw = id => db.prepare('SELECT * FROM knowindex_contributions WHERE id=?').get(id);
  const headHash = () => db.prepare('SELECT event_hash FROM knowindex_events ORDER BY seq DESC LIMIT 1').get()?.event_hash || ZERO_HASH;

  function appendEvent(event) {
    const timestamp = asIso(now);
    const payloadJson = JSON.stringify(event.payload);
    const previousHash = headHash();
    const hash = eventHash(previousHash, { ...event, payloadJson, occurredAt: timestamp });
    db.prepare('INSERT INTO knowindex_events (contribution_id,action,actor_subject,from_state,to_state,payload_json,previous_hash,event_hash,occurred_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(event.contributionId, event.action, event.actorSubject, event.fromState || null,
        event.toState, payloadJson, previousHash, hash, timestamp);
  }

  function inTransaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      if (!verifyAuditChain().valid) throw new KnowledgeWriteError('audit_integrity_failed', 503);
      const result = fn();
      db.exec('COMMIT');
      return result;
    }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }

  function submit(input, actor, requestKey = randomUUID()) {
    const subject = assertActor(actor);
    const details = normalizeContribution(input);
    const key = safeText(requestKey, 'idempotency_key', 128, 10);
    if (!/^[a-zA-Z0-9._:-]+$/.test(key)) throw new KnowledgeWriteError('invalid_idempotency_key');
    const payloadSha256 = sha256(JSON.stringify(details));
    return inTransaction(() => {
      const existing = db.prepare('SELECT * FROM knowindex_contributions WHERE actor_subject=? AND request_key=?').get(subject, key);
      if (existing) {
        if (existing.payload_sha256 !== payloadSha256) throw new KnowledgeWriteError('idempotency_conflict', 409);
        return { ...fromRow(existing), idempotentReplay: true };
      }
      const timestamp = asIso(now);
      const hourAgo = new Date(Date.parse(timestamp) - 3600_000).toISOString();
      const count = db.prepare('SELECT COUNT(*) AS total FROM knowindex_contributions WHERE actor_subject=? AND created_at>=?').get(subject, hourAgo).total;
      if (count >= maxSubmissionsPerHour) throw new KnowledgeWriteError('submission_rate_limited', 429);
      const id = randomUUID();
      db.prepare('INSERT INTO knowindex_contributions (id,actor_subject,request_key,title,source_url,description,attribution,community,source_class,rights_basis,rights_statement,state,version,payload_sha256,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, subject, key, details.title, details.url, details.description, details.attribution, details.community,
          details.sourceClass, details.rightsBasis, details.rightsStatement, 'submitted', 1, payloadSha256, timestamp, timestamp);
      appendEvent({ contributionId: id, action: 'submit', actorSubject: subject, fromState: null, toState: 'submitted', payload: { payloadSha256, rightsBasis: details.rightsBasis } });
      return fromRow(getRaw(id));
    });
  }

  function read(id, actor) {
    const subject = assertActor(actor);
    const record = fromRow(getRaw(id));
    if (!record || (record.submittedBy !== subject && !reviewer(actor))) throw new KnowledgeWriteError('contribution_not_found', 404);
    return record;
  }

  function list(actor, { state = 'submitted', limit = 30 } = {}) {
    assertActor(actor);
    if (!reviewer(actor)) throw new KnowledgeWriteError('reviewer_required', 403);
    if (!['submitted','validated','attributed','approved','disputed','removed'].includes(state)) throw new KnowledgeWriteError('invalid_state');
    const bounded = Number(limit);
    if (!Number.isInteger(bounded) || bounded < 1 || bounded > 50) throw new KnowledgeWriteError('invalid_limit');
    return db.prepare('SELECT * FROM knowindex_contributions WHERE state=? ORDER BY created_at DESC, id DESC LIMIT ?').all(state, bounded).map(fromRow);
  }

  function change(id, actor, { action, note, expectedVersion } = {}) {
    const subject = assertActor(actor);
    const details = TRANSITIONS[action];
    if (action !== 'withdraw' && !details) throw new KnowledgeWriteError('unknown_review_action');
    const cleanNote = safeText(note, 'review_note', 700, 10);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new KnowledgeWriteError('expected_version_required');
    return inTransaction(() => {
      const old = getRaw(id);
      if (!old) throw new KnowledgeWriteError('contribution_not_found', 404);
      if (old.version !== expectedVersion) throw new KnowledgeWriteError('stale_contribution_version', 409);
      if (action === 'withdraw') {
        if (old.actor_subject !== subject && !reviewer(actor)) throw new KnowledgeWriteError('contribution_not_found', 404);
        if (old.state === 'removed') throw new KnowledgeWriteError('invalid_state_transition', 409);
      } else {
        if (!reviewer(actor)) throw new KnowledgeWriteError('reviewer_required', 403);
        if (old.actor_subject === subject) throw new KnowledgeWriteError('self_review_denied', 403);
        if (!details.from.includes(old.state)) throw new KnowledgeWriteError('invalid_state_transition', 409);
      }
      const next = action === 'withdraw' ? 'removed' : details.to;
      const timestamp = asIso(now);
      const update = db.prepare('UPDATE knowindex_contributions SET state=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(next, timestamp, id, old.version);
      if (update.changes !== 1) throw new KnowledgeWriteError('stale_contribution_version', 409);
      appendEvent({ contributionId: id, action, actorSubject: subject, fromState: old.state, toState: next, payload: { note: cleanNote, version: old.version + 1 } });
      return fromRow(getRaw(id));
    });
  }

  function audit(id, actor) {
    read(id, actor);
    return db.prepare('SELECT * FROM knowindex_events WHERE contribution_id=? ORDER BY seq ASC').all(id).map(row => ({
      seq: row.seq, contributionId: row.contribution_id, action: row.action,
      actorSubject: row.actor_subject, fromState: row.from_state, toState: row.to_state,
      payload: JSON.parse(row.payload_json), previousHash: row.previous_hash,
      eventHash: row.event_hash, occurredAt: row.occurred_at
    }));
  }

  function verifyAuditChain() {
    let previousHash = ZERO_HASH;
    let count = 0;
    for (const row of db.prepare('SELECT * FROM knowindex_events ORDER BY seq ASC').all()) {
      const check = eventHash(previousHash, {
        contributionId: row.contribution_id, action: row.action, actorSubject: row.actor_subject,
        fromState: row.from_state, toState: row.to_state, payloadJson: row.payload_json, occurredAt: row.occurred_at
      });
      if (row.previous_hash !== previousHash || row.event_hash !== check) return { valid: false, checked: count, headHash: previousHash, failedSeq: row.seq };
      previousHash = row.event_hash;
      count++;
    }
    return { valid: true, checked: count, headHash: previousHash };
  }

  return { submit, read, list, change, audit, verifyAuditChain, close: () => db.close(), db };
}
