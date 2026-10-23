import { createHash, randomUUID } from 'node:crypto';
import { KnowledgeWriteError, normalizeContribution, eventHash, assertActor, reviewer } from './ledger.mjs';

const ZERO_HASH = '0'.repeat(64);
const APPROVED_STATES = ['submitted', 'validated', 'attributed', 'approved', 'disputed', 'removed'];
const TRANSITIONS = {
  validate: { from: ['submitted'], to: 'validated' },
  attribute: { from: ['validated'], to: 'attributed' },
  approve: { from: ['attributed'], to: 'approved' },
  dispute: { from: ['validated', 'attributed', 'approved'], to: 'disputed' },
  reject: { from: ['submitted', 'validated', 'attributed', 'disputed'], to: 'removed' },
  remove: { from: ['approved', 'disputed'], to: 'removed' }
};
const hash = value => createHash('sha256').update(value).digest('hex');
const time = now => {
  const value = now();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid_clock');
  return date.toISOString();
};
const safeText = (value, field, max, min) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max ||
      value.includes('\0')) throw new KnowledgeWriteError('invalid_' + field);
  return value.trim();
};
const normalRow = row => row && ({
  id: row.id, submittedBy: row.actor_subject, title: row.title, url: row.source_url,
  description: row.description, attribution: row.attribution, community: row.community,
  sourceClass: row.source_class, rightsBasis: row.rights_basis, rightsStatement: row.rights_statement,
  state: row.state, version: Number(row.version), payloadSha256: row.payload_sha256,
  createdAt: row.created_at, updatedAt: row.updated_at, indexPublished: false
});
const auditRow = row => ({
  seq: Number(row.seq), contributionId: row.contribution_id, action: row.action,
  actorSubject: row.actor_subject, fromState: row.from_state, toState: row.to_state,
  payload: JSON.parse(row.payload_json), previousHash: row.previous_hash,
  eventHash: row.event_hash, occurredAt: row.occurred_at
});

function verifyRows(rows) {
  let previousHash = ZERO_HASH, count = 0;
  for (const row of rows) {
    const check = eventHash(previousHash, {
      contributionId: row.contribution_id, action: row.action,
      actorSubject: row.actor_subject, fromState: row.from_state,
      toState: row.to_state, payloadJson: row.payload_json, occurredAt: row.occurred_at
    });
    if (row.previous_hash !== previousHash || row.event_hash !== check) {
      return { valid: false, checked: count, failedSeq: Number(row.seq), headHash: previousHash };
    }
    previousHash = row.event_hash;
    count++;
  }
  return { valid: true, checked: count, headHash: previousHash };
}

export function createKnowindexPostgresLedger({
  pool, now = () => new Date(), maxSubmissionsPerHour = 5
} = {}) {
  if (!pool || typeof pool.query !== 'function' || typeof pool.connect !== 'function') throw new Error('durable_postgres_pool_required');
  if (!Number.isInteger(maxSubmissionsPerHour) || maxSubmissionsPerHour < 1 || maxSubmissionsPerHour > 100) throw new Error('invalid_rate_limit');

  async function get(client, id) {
    const result = await client.query('SELECT * FROM knowindex.contributions WHERE id=$1', [id]);
    return result.rows?.[0] || null;
  }
  async function scan(client) {
    const { rows } = await client.query('SELECT * FROM knowindex.events ORDER BY seq ASC');
    return verifyRows(rows || []);
  }
  async function append(client, contributionId, action, actorSubject, fromState, toState, payload) {
    const date = time(now);
    const previous = await client.query('SELECT event_hash FROM knowindex.events ORDER BY seq DESC LIMIT 1');
    const previousHash = previous.rows?.[0]?.event_hash || ZERO_HASH;
    const payloadJson = JSON.stringify(payload);
    const digest = eventHash(previousHash, { contributionId, action, actorSubject, fromState, toState, payloadJson, occurredAt: date });
    await client.query('INSERT INTO knowindex.events(contribution_id,action,actor_subject,from_state,to_state,payload_json,previous_hash,event_hash,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [contributionId, action, actorSubject, fromState, toState, payloadJson, previousHash, digest, date]);
  }
  async function transaction(fn) {
    const client = await pool.connect();
    let started = false;
    try {
      await client.query('BEGIN');
      started = true;
      // Global writer lock prevents concurrent contributions from forking the audit chain.
      await client.query('SELECT pg_advisory_xact_lock(815, 15015)');
      const integrity = await scan(client);
      if (!integrity.valid) throw new KnowledgeWriteError('audit_integrity_failed', 503);
      const result = await fn(client);
      await client.query('COMMIT');
      started = false;
      return result;
    } catch (error) {
      if (started) {
        try { await client.query('ROLLBACK'); } catch {}
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function submit(input, actor, requestKey = randomUUID()) {
    const subject = assertActor(actor);
    const details = normalizeContribution(input);
    const key = safeText(requestKey, 'idempotency_key', 128, 10);
    if (!/^[a-zA-Z0-9._:-]+$/.test(key)) throw new KnowledgeWriteError('invalid_idempotency_key');
    const payloadSha256 = hash(JSON.stringify(details));
    return transaction(async client => {
      const existing = await client.query('SELECT * FROM knowindex.contributions WHERE actor_subject=$1 AND request_key=$2', [subject, key]);
      if (existing.rows?.length) {
        const old = existing.rows[0];
        if (old.payload_sha256 !== payloadSha256) throw new KnowledgeWriteError('idempotency_conflict', 409);
        return { ...normalRow(old), idempotentReplay: true };
      }
      const timestamp = time(now);
      const hourAgo = new Date(Date.parse(timestamp) - 3600000).toISOString();
      const counter = await client.query('SELECT count(*)::integer AS total FROM knowindex.contributions WHERE actor_subject=$1 AND created_at>=$2', [subject, hourAgo]);
      if (Number(counter.rows?.[0]?.total || 0) >= maxSubmissionsPerHour) throw new KnowledgeWriteError('submission_rate_limited', 429);
      const id = randomUUID();
      await client.query('INSERT INTO knowindex.contributions(id,actor_subject,request_key,title,source_url,description,attribution,community,source_class,rights_basis,rights_statement,state,version,payload_sha256,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
        [id, subject, key, details.title, details.url, details.description, details.attribution, details.community,
          details.sourceClass, details.rightsBasis, details.rightsStatement, 'submitted', 1, payloadSha256, timestamp, timestamp]);
      await append(client, id, 'submit', subject, null, 'submitted', { payloadSha256, rightsBasis: details.rightsBasis });
      return normalRow(await get(client, id));
    });
  }

  async function read(id, actor) {
    const subject = assertActor(actor);
    const row = await get(pool, id);
    if (!row || (row.actor_subject !== subject && !reviewer(actor))) throw new KnowledgeWriteError('contribution_not_found', 404);
    return normalRow(row);
  }

  async function list(actor, { state = 'submitted', limit = 30 } = {}) {
    assertActor(actor);
    if (!reviewer(actor)) throw new KnowledgeWriteError('reviewer_required', 403);
    if (!APPROVED_STATES.includes(state)) throw new KnowledgeWriteError('invalid_state');
    const bound = Number(limit);
    if (!Number.isInteger(bound) || bound < 1 || bound > 50) throw new KnowledgeWriteError('invalid_limit');
    const result = await pool.query('SELECT * FROM knowindex.contributions WHERE state=$1 ORDER BY created_at DESC,id DESC LIMIT $2', [state, bound]);
    return (result.rows || []).map(normalRow);
  }

  async function change(id, actor, { action, note, expectedVersion } = {}) {
    const subject = assertActor(actor);
    if (action !== 'withdraw' && !TRANSITIONS[action]) throw new KnowledgeWriteError('unknown_review_action');
    const safeNote = safeText(note, 'review_note', 700, 10);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new KnowledgeWriteError('expected_version_required');
    return transaction(async client => {
      const old = await get(client, id);
      if (!old) throw new KnowledgeWriteError('contribution_not_found', 404);
      if (Number(old.version) !== expectedVersion) throw new KnowledgeWriteError('stale_contribution_version', 409);
      if (action === 'withdraw') {
        if (old.actor_subject !== subject && !reviewer(actor)) throw new KnowledgeWriteError('contribution_not_found', 404);
        if (old.state === 'removed') throw new KnowledgeWriteError('invalid_state_transition', 409);
      } else {
        if (!reviewer(actor)) throw new KnowledgeWriteError('reviewer_required', 403);
        if (old.actor_subject === subject) throw new KnowledgeWriteError('self_review_denied', 403);
        if (!TRANSITIONS[action].from.includes(old.state)) throw new KnowledgeWriteError('invalid_state_transition', 409);
      }
      const next = action === 'withdraw' ? 'removed' : TRANSITIONS[action].to;
      const timestamp = time(now);
      const update = await client.query('UPDATE knowindex.contributions SET state=$1,version=version+1,updated_at=$2 WHERE id=$3 AND version=$4 RETURNING *',
        [next, timestamp, id, expectedVersion]);
      if (update.rowCount !== 1) throw new KnowledgeWriteError('stale_contribution_version', 409);
      await append(client, id, action, subject, old.state, next, { note: safeNote, version: expectedVersion + 1 });
      return normalRow(update.rows[0]);
    });
  }

  async function audit(id, actor) {
    await read(id, actor);
    const result = await pool.query('SELECT * FROM knowindex.events WHERE contribution_id=$1 ORDER BY seq ASC', [id]);
    return (result.rows || []).map(auditRow);
  }

  async function verifyAuditChain() {
    return scan(pool);
  }

  async function checkSchema() {
    const result = await pool.query("SELECT to_regclass('knowindex.contributions')::text AS contributions, to_regclass('knowindex.events')::text AS events");
    return result.rows?.[0]?.contributions === 'knowindex.contributions' && result.rows?.[0]?.events === 'knowindex.events';
  }

  // Read-only runtime introspection. Never returns role names, account IDs,
  // connection strings, secret references, or user contributions.
  async function inspectRuntimeSecurity() {
    if (!await checkSchema()) return {
      leastPrivilegeVerified: false, productionDatabaseEligible: false,
      auditChainVerified: false, checks: { schemaPresent: false }
    };

    const result = await pool.query(String.raw`
      SELECT
        current_database() AS database_name,
        pg_is_in_recovery() AS read_replica,
        (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
           FROM pg_roles WHERE rolname=current_user) AS elevated_role,
        has_database_privilege(current_database(), 'CREATE') AS database_create,
        has_schema_privilege('knowindex','USAGE') AS schema_usage,
        has_schema_privilege('knowindex','CREATE') AS schema_create,
        has_table_privilege('knowindex.contributions','SELECT') AS contributions_read,
        has_table_privilege('knowindex.contributions','INSERT') AS contributions_insert,
        has_table_privilege('knowindex.contributions','UPDATE') AS contributions_update,
        has_table_privilege('knowindex.contributions','DELETE') AS contributions_delete,
        has_table_privilege('knowindex.contributions','TRUNCATE') AS contributions_truncate,
        has_table_privilege('knowindex.events','SELECT') AS events_read,
        has_table_privilege('knowindex.events','INSERT') AS events_insert,
        has_table_privilege('knowindex.events','UPDATE') AS events_update,
        has_table_privilege('knowindex.events','DELETE') AS events_delete,
        has_table_privilege('knowindex.events','TRUNCATE') AS events_truncate,
        has_table_privilege('knowindex.events','TRIGGER') AS events_trigger,
        has_sequence_privilege('knowindex.events_seq_seq','USAGE') AS event_sequence_usage,
        (SELECT pg_has_role(current_user, pg_get_userbyid(relowner), 'MEMBER')
         FROM pg_class WHERE oid='knowindex.events'::regclass) AS member_of_audit_owner,
        (SELECT COUNT(*)=2 FROM pg_trigger
         WHERE tgrelid='knowindex.events'::regclass AND NOT tgisinternal
           AND tgname IN ('knowindex_events_no_update','knowindex_events_no_delete')
           AND tgenabled='O') AS audit_triggers_active
    `);
    const row = result.rows?.[0] || {};
    const checks = {
      schemaPresent: true,
      primaryDatabase: row.read_replica === false,
      unprivilegedRole: row.elevated_role === false,
      noDatabaseCreate: row.database_create === false,
      scopedSchema: row.schema_usage === true && row.schema_create === false,
      contributionPermissions: row.contributions_read === true &&
        row.contributions_insert === true && row.contributions_update === true &&
        row.contributions_delete === false && row.contributions_truncate === false,
      appendOnlyEvents: row.events_read === true && row.events_insert === true &&
        row.events_update === false && row.events_delete === false &&
        row.events_truncate === false && row.events_trigger === false,
      sequenceUsage: row.event_sequence_usage === true,
      notAuditOwner: row.member_of_audit_owner === false,
      auditTriggersActive: row.audit_triggers_active === true
    };
    const chain = await scan(pool);
    checks.auditChainValid = chain.valid === true;
    const unsafeNames = new Set([
      'postgres','template0','template1','noogle-connect-dev',
      'noogle_connect_dev','neo-pads-production','neo_pads_production',
      'knowindex_ci_test','knowindex_ci_restore'
    ]);
    const productionDatabaseEligible = typeof row.database_name === 'string' &&
      !unsafeNames.has(row.database_name.toLowerCase());
    return {
      leastPrivilegeVerified: Object.values(checks).every(value => value === true),
      productionDatabaseEligible,
      auditChainVerified: chain.valid === true,
      auditEventsChecked: chain.checked,
      // Off-host backups and human approvals CANNOT be established from DB grants.
      offHostBackupVerified: false,
      actualProductionRestoreVerified: false,
      liveIdentityVerified: false,
      checks: Object.freeze(checks)
    };
  }

  // The calling production runtime owns the pool and its lifecycle. No auto-migrate.
  return Object.freeze({ submit, read, list, change, audit, verifyAuditChain, checkSchema, inspectRuntimeSecurity });
}
