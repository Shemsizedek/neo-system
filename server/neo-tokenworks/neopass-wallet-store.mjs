import { DatabaseSync } from 'node:sqlite';

// Single-host durable challenge store. Use a persistent local disk, never an
// ephemeral Render filesystem or a network-shared SQLite database.
export function createSqliteWalletProofStore({ path } = {}) {
  if (typeof path !== 'string' || !path || path === ':memory:') throw Error('persistent_wallet_store_path_required');
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA busy_timeout=5000;
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS neopass_wallet_challenges (
      id TEXT PRIMARY KEY, subject TEXT NOT NULL, session_id TEXT NOT NULL,
      origin TEXT NOT NULL, expires_at INTEGER NOT NULL,
      consumed_at INTEGER, record_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS neopass_wallet_challenges_expiry
      ON neopass_wallet_challenges(expires_at);`);
  const insert = db.prepare('INSERT INTO neopass_wallet_challenges(id,subject,session_id,origin,expires_at,record_json) VALUES(?,?,?,?,?,?)');
  const consume = db.prepare(`UPDATE neopass_wallet_challenges SET consumed_at=?
    WHERE id=? AND subject=? AND session_id=? AND origin=?
      AND expires_at>? AND consumed_at IS NULL RETURNING record_json`);
  return Object.freeze({
    insert(row) {
      insert.run(row.id, row.subject, row.sessionId, row.origin, row.expiresAt, JSON.stringify(row));
    },
    consumeAtomic({ id, subject, sessionId, origin, now }) {
      const result = consume.get(now, id, subject, sessionId, origin, now);
      return result ? JSON.parse(result.record_json) : null;
    },
    pruneExpired(now) {
      if (!Number.isSafeInteger(now)) throw Error('invalid_cleanup_time');
      return db.prepare('DELETE FROM neopass_wallet_challenges WHERE expires_at<=?').run(now).changes;
    },
    close() { db.close(); }
  });
}
