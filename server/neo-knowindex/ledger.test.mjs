import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createKnowindexContributionLedger, normalizeContribution, KnowledgeWriteError } from './ledger.mjs';

const member = { subject: 'google:contributor-1', neopassStatus: 'active', role: 'member' };
const curator = { subject: 'google:curator-2', neopassStatus: 'active', role: 'curator' };
const admin = { subject: 'google:admin-3', neopassStatus: 'active', role: 'executive-admin' };
const now = () => new Date('2026-10-23T12:00:00.000Z');
const input = (overrides = {}) => ({
  title: 'An attributed library reference',
  url: 'https://example.org/knowledge/page#part',
  description: 'An independently reviewable historical source with attribution.',
  attribution: 'Original publisher and community',
  community: 'Archive contributors',
  sourceClass: 'archive',
  rightsBasis: 'link-only',
  rightsStatement: 'Link metadata may be reviewed; no third-party full text is licensed.',
  consentToIndex: true,
  ...overrides
});
const ledger = options => createKnowindexContributionLedger({ now, ...options });
const errorCode = code => error => error instanceof KnowledgeWriteError && error.code === code;

test('pending contribution is stored with normalized HTTPS URL, no index publication', () => {
  const store = ledger();
  try {
    const record = store.submit(input(), member, 'request-abc-123');
    assert.equal(record.state, 'submitted');
    assert.equal(record.version, 1);
    assert.equal(record.url, 'https://example.org/knowledge/page');
    assert.equal(record.indexPublished, false);
    assert.equal(record.submittedBy, member.subject);
    assert.equal(store.verifyAuditChain().valid, true);
    assert.equal(store.verifyAuditChain().checked, 1);
  } finally { store.close(); }
});

test('requires consent and declared rights, rejects private hosts and tokenized links', () => {
  for (const change of [
    { consentToIndex: false },
    { rightsStatement: 'short' },
    { rightsBasis: 'unknown' },
    { url: 'http://example.org/' },
    { url: 'https://localhost/page' },
    { url: 'https://192.168.2.1/page' },
    { url: 'https://example.org/page?token=private' },
    { url: 'https://user:password@example.org/' }
  ]) assert.throws(() => normalizeContribution(input(change)), KnowledgeWriteError);
});

test('fails closed for missing or pending identity and rejects self-review', () => {
  const store = ledger();
  try {
    assert.throws(() => store.submit(input(), { ...member, neopassStatus: 'pending' }), errorCode('active_verified_neopass_required'));
    const owned = store.submit(input(), member);
    assert.throws(() => store.list(member), errorCode('reviewer_required'));
    assert.throws(() => store.change(owned.id, { ...member, role: 'curator' }, { action: 'validate', note: 'Review is supported by the evidence.', expectedVersion: 1 }), errorCode('self_review_denied'));
    assert.throws(() => store.read(owned.id, { ...member, subject: 'google:other' }), errorCode('contribution_not_found'));
  } finally { store.close(); }
});

test('curation requires separate reviewer, exact transition order and optimistic version', () => {
  const store = ledger();
  try {
    const record = store.submit(input(), member);
    assert.throws(() => store.change(record.id, curator, { action: 'approve', note: 'Evidence is appropriate.', expectedVersion: 1 }), errorCode('invalid_state_transition'));
    const validated = store.change(record.id, curator, { action: 'validate', note: 'Source metadata is structurally complete.', expectedVersion: 1 });
    assert.equal(validated.state, 'validated');
    assert.throws(() => store.change(record.id, curator, { action: 'attribute', note: 'Attribution verified independently.', expectedVersion: 1 }), errorCode('stale_contribution_version'));
    const attributed = store.change(record.id, curator, { action: 'attribute', note: 'Attribution verified independently.', expectedVersion: 2 });
    assert.equal(attributed.state, 'attributed');
    const approved = store.change(record.id, admin, { action: 'approve', note: 'Approved for separate snapshot release review.', expectedVersion: 3 });
    assert.equal(approved.state, 'approved');
    assert.equal(approved.indexPublished, false);
    assert.equal(store.verifyAuditChain().checked, 4);
    assert.equal(store.audit(record.id, member).length, 4);
    assert.equal(store.list(curator, { state: 'approved' }).length, 1);
  } finally { store.close(); }
});

test('contributors may withdraw approved work, leaving an immutable audit trail', () => {
  const store = ledger();
  try {
    const record = store.submit(input(), member);
    store.change(record.id, curator, { action: 'validate', note: 'Metadata validated safely.', expectedVersion: 1 });
    store.change(record.id, curator, { action: 'attribute', note: 'Publisher attribution documented.', expectedVersion: 2 });
    store.change(record.id, curator, { action: 'approve', note: 'Reviewed for internal approval only.', expectedVersion: 3 });
    const removed = store.change(record.id, member, { action: 'withdraw', note: 'Contributor retracts permission to index.', expectedVersion: 4 });
    assert.equal(removed.state, 'removed');
    assert.equal(removed.indexPublished, false);
    assert.equal(store.verifyAuditChain().valid, true);
    const event = store.audit(record.id, member).at(-1);
    assert.equal(event.action, 'withdraw');
    assert.equal(event.toState, 'removed');
    assert.throws(() => store.db.prepare('DELETE FROM knowindex_events').run(), /append_only_audit/);
    assert.throws(() => store.db.prepare("UPDATE knowindex_events SET action='fake'").run(), /append_only_audit/);
  } finally { store.close(); }
});

test('idempotency returns same contribution and rejects modified retries', () => {
  const store = ledger();
  try {
    const first = store.submit(input(), member, 'request-unique-111');
    const replay = store.submit(input(), member, 'request-unique-111');
    assert.equal(replay.id, first.id);
    assert.equal(replay.idempotentReplay, true);
    assert.equal(store.verifyAuditChain().checked, 1);
    assert.throws(() => store.submit(input({ title: 'Different source title' }), member, 'request-unique-111'), errorCode('idempotency_conflict'));
  } finally { store.close(); }
});

test('rate limiter blocks flood of submissions even when URL differs', () => {
  const store = ledger({ maxSubmissionsPerHour: 2 });
  try {
    store.submit(input({ url: 'https://example.org/a' }), member);
    store.submit(input({ url: 'https://example.org/b' }), member);
    assert.throws(() => store.submit(input({ url: 'https://example.org/c' }), member), errorCode('submission_rate_limited'));
    assert.equal(store.verifyAuditChain().checked, 2);
  } finally { store.close(); }
});

test('SQLite state and audit chain survive restart', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-knowindex-'));
  const file = path.join(tmp, 'contributions.sqlite');
  try {
    const first = ledger({ file });
    const entry = first.submit(input(), member);
    first.close();
    const reopened = ledger({ file });
    try {
      assert.equal(reopened.read(entry.id, member).state, 'submitted');
      assert.deepEqual(reopened.verifyAuditChain().valid, true);
      reopened.change(entry.id, curator, { action: 'validate', note: 'Metadata verified upon reopening.', expectedVersion: 1 });
      assert.equal(reopened.verifyAuditChain().checked, 2);
    } finally { reopened.close(); }
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});

test('wrong actor cannot withdraw or enumerate private records', () => {
  const store = ledger();
  try {
    const record = store.submit(input(), member);
    const outsider = { ...member, subject: 'google:outsider' };
    assert.throws(() => store.change(record.id, outsider, { action: 'withdraw', note: 'Unauthorized withdrawal attempt.', expectedVersion: 1 }), errorCode('contribution_not_found'));
    assert.throws(() => store.audit(record.id, outsider), errorCode('contribution_not_found'));
    assert.equal(store.read(record.id, member).version, 1);
  } finally { store.close(); }
});

test('tamper-evident audit checks detect broken hash linkage', () => {
  const store = ledger();
  try {
    store.submit(input(), member);
    assert.equal(store.verifyAuditChain().valid, true);
    store.db.exec('DROP TRIGGER knowindex_audit_no_update');
    store.db.prepare("UPDATE knowindex_events SET previous_hash='corrupted' WHERE seq=1").run();
    assert.equal(store.verifyAuditChain().valid, false);
  } finally { store.close(); }
});
