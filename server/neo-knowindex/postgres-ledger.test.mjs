import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createKnowindexPostgresLedger } from './postgres-ledger.mjs';
import { KnowledgeWriteError } from './ledger.mjs';

const DATABASE_URL = process.env.KNOWINDEX_PG_TEST_URL || '';
const explicitTestDb = (() => {
  try { return new URL(DATABASE_URL).pathname === '/knowindex_ci_test'; }
  catch { return false; }
})();
if (DATABASE_URL && !explicitTestDb) throw new Error('refusing_non_CI_test_database');
const contributor = { subject: 'google:ci-contributor', neopassStatus: 'active', role: 'member' };
const curator = { subject: 'google:ci-curator', neopassStatus: 'active', role: 'curator' };
const admin = { subject: 'google:ci-executive', neopassStatus: 'active', role: 'executive-admin' };
const fixedNow = () => new Date('2026-10-23T13:00:00.000Z');
const input = (extra = {}) => ({
  title: 'A public library reference',
  url: 'https://example.org/knowindex/reference',
  description: 'Attributed knowledge metadata for controlled human review.',
  attribution: 'Contributing organization',
  community: 'Source community',
  sourceClass: 'archive',
  rightsBasis: 'link-only',
  rightsStatement: 'Index the public link and attribution only.',
  consentToIndex: true,
  ...extra
});
const code = name => error => error instanceof KnowledgeWriteError && error.code === name;

test('KI-015 Postgres durable ledger: isolated persistence, audit and disaster-recovery drill',
  { skip: !DATABASE_URL }, async t => {
    const { Pool } = await import('pg');
    const ownerPool = new Pool({ connectionString: DATABASE_URL, max: 4 });
    const runtimeUrl = new URL(DATABASE_URL);
    runtimeUrl.username = 'knowindex_ci_writer';
    runtimeUrl.password = 'test-only-password-ki015';
    const writerPool = new Pool({ connectionString: runtimeUrl.href, max: 4 });
    try {
      const sql = await fs.readFile('server/neo-knowindex/migrations/001_durable_contributions.sql', 'utf8');
      await ownerPool.query(sql);
      await ownerPool.query(sql); // migration must be idempotent

      // Only the ephemeral CI DB is modified here. Never use production URLs.
      await ownerPool.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='knowindex_ci_writer') THEN CREATE ROLE knowindex_ci_writer LOGIN PASSWORD 'test-only-password-ki015'; END IF; END $$");
      await ownerPool.query('GRANT CONNECT ON DATABASE knowindex_ci_test TO knowindex_ci_writer');
      await ownerPool.query('GRANT USAGE ON SCHEMA knowindex TO knowindex_ci_writer');
      await ownerPool.query('GRANT SELECT,INSERT,UPDATE ON knowindex.contributions TO knowindex_ci_writer');
      await ownerPool.query('GRANT SELECT,INSERT ON knowindex.events TO knowindex_ci_writer');
      await ownerPool.query('GRANT USAGE,SELECT ON SEQUENCE knowindex.events_seq_seq TO knowindex_ci_writer');

      const store = createKnowindexPostgresLedger({ pool: writerPool, now: fixedNow, maxSubmissionsPerHour: 5 });
      await t.test('schema exists and runtime user is not migration owner', async () => {
        assert.equal(await store.checkSchema(), true);
        const role = await writerPool.query('SELECT current_user AS role');
        assert.equal(role.rows[0].role, 'knowindex_ci_writer');
        await assert.rejects(writerPool.query('CREATE TABLE knowindex.unauthorized_runtime_ddl(id integer)'), /permission denied/);
        await assert.rejects(writerPool.query('DELETE FROM knowindex.events'), /permission denied/);
      });
      await t.test('idempotent submission, distinct reviewer and hash audit', async () => {
        const record = await store.submit(input(), contributor, 'ci-request-0000001');
        assert.equal(record.state, 'submitted');
        assert.equal(record.indexPublished, false);
        const replay = await store.submit(input(), contributor, 'ci-request-0000001');
        assert.equal(replay.id, record.id);
        assert.equal(replay.idempotentReplay, true);
        await assert.rejects(store.submit(input({ title: 'Changed title' }), contributor, 'ci-request-0000001'), code('idempotency_conflict'));
        await assert.rejects(store.change(record.id, { ...contributor, role: 'curator' }, { action: 'validate', note: 'Self-review must be rejected.', expectedVersion: 1 }), code('self_review_denied'));
        const validated = await store.change(record.id, curator, { action: 'validate', note: 'Structure and HTTPS URL verified.', expectedVersion: 1 });
        assert.equal(validated.state, 'validated');
        const attributed = await store.change(record.id, curator, { action: 'attribute', note: 'Community and publisher verified.', expectedVersion: 2 });
        assert.equal(attributed.state, 'attributed');
        const approved = await store.change(record.id, admin, { action: 'approve', note: 'Ready for separate release review.', expectedVersion: 3 });
        assert.equal(approved.state, 'approved');
        assert.equal(approved.indexPublished, false);
        const withdrawn = await store.change(record.id, contributor, { action: 'withdraw', note: 'Contributor requests removal.', expectedVersion: 4 });
        assert.equal(withdrawn.state, 'removed');
        assert.equal((await store.audit(record.id, contributor)).length, 5);
        assert.deepEqual((await store.verifyAuditChain()).valid, true);
      });
      await t.test('concurrent submissions preserve one global linear audit chain', async () => {
        const tasks = Array.from({ length: 6 }, (_, index) =>
          store.submit(input({ url: 'https://example.org/library/ci-' + index }),
            { ...contributor, subject: 'google:ci-parallel-' + index }, 'parallel-request-' + index + '-unique'));
        const submitted = await Promise.all(tasks);
        assert.equal(new Set(submitted.map(item => item.id)).size, 6);
        assert.equal((await store.verifyAuditChain()).checked, 11);
        const recent = await writerPool.query('SELECT previous_hash,event_hash FROM knowindex.events ORDER BY seq ASC');
        assert.equal(recent.rows.length, 11);
        for (let i = 1; i < recent.rows.length; i++) assert.equal(recent.rows[i].previous_hash, recent.rows[i-1].event_hash);
      });
      await t.test('writer survives connection recreation and cannot edit immutable events', async () => {
        const another = createKnowindexPostgresLedger({ pool: writerPool, now: fixedNow });
        assert.equal((await another.verifyAuditChain()).valid, true);
        const records = await another.list(curator, { state: 'removed' });
        assert.equal(records.length, 1);
        await assert.rejects(writerPool.query("UPDATE knowindex.events SET action='tampered'"), /permission denied/);
      });
      await t.test('logical recovery fixture restores identical audit chain', async () => {
        const before = await store.verifyAuditChain();
        const client = await ownerPool.connect();
        try {
          await client.query('BEGIN');
          await client.query('CREATE TEMP TABLE ki015_saved_contributions ON COMMIT DROP AS SELECT * FROM knowindex.contributions');
          await client.query('CREATE TEMP TABLE ki015_saved_events ON COMMIT DROP AS SELECT * FROM knowindex.events');
          await client.query('TRUNCATE TABLE knowindex.events,knowindex.contributions RESTART IDENTITY CASCADE');
          await client.query('INSERT INTO knowindex.contributions SELECT * FROM ki015_saved_contributions');
          await client.query('INSERT INTO knowindex.events(seq,contribution_id,action,actor_subject,from_state,to_state,payload_json,previous_hash,event_hash,occurred_at) SELECT seq,contribution_id,action,actor_subject,from_state,to_state,payload_json,previous_hash,event_hash,occurred_at FROM ki015_saved_events ORDER BY seq');
          await client.query("SELECT setval('knowindex.events_seq_seq', (SELECT MAX(seq) FROM knowindex.events), true)");
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
        const after = await store.verifyAuditChain();
        assert.equal(after.valid, true);
        assert.equal(after.headHash, before.headHash);
        assert.equal(after.checked, before.checked);
      });
      await t.test('audit mutation detection fails closed on all later writes', async () => {
        // Owner simulates privileged corruption; test-only schema is reset by the CI container lifecycle.
        const original = await ownerPool.query('SELECT previous_hash FROM knowindex.events WHERE seq=1');
        await ownerPool.query('ALTER TABLE knowindex.events DISABLE TRIGGER knowindex_events_no_update');
        try {
          await ownerPool.query("UPDATE knowindex.events SET previous_hash='tampered' WHERE seq=1");
          assert.equal((await store.verifyAuditChain()).valid, false);
          await assert.rejects(store.submit(input({ url: 'https://example.org/after-tamper' }), contributor, 'after-tamper-0001'), code('audit_integrity_failed'));
        } finally {
          await ownerPool.query('UPDATE knowindex.events SET previous_hash=$1 WHERE seq=1', [original.rows[0].previous_hash]);
          await ownerPool.query('ALTER TABLE knowindex.events ENABLE TRIGGER knowindex_events_no_update');
        }
        assert.equal((await store.verifyAuditChain()).valid, true);
      });
    } finally {
      await writerPool.end();
      await ownerPool.end();
    }
  });
