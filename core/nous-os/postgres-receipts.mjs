/**
 * Neon/PostgreSQL planning receipts. This module is loaded only when
 * NOUS_DATABASE_URL is supplied; it never stores tokens, prompts or secrets.
 * A database primary key provides atomic idempotency across replica restarts.
 */
export async function createPostgresReceiptStore({ connectionString, poolFactory } = {}) {
  if (typeof connectionString !== 'string' || !/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new Error('nous_database_url_required');
  }
  let pool;
  if (poolFactory) pool = poolFactory(connectionString);
  else {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({ connectionString, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000 });
  }
  const table = 'public.nous_receipts';
  return {
    async ping() {
      const { rows } = await pool.query('SELECT 1 AS healthy');
      return rows[0]?.healthy === 1;
    },
    async getOrCreate(receipt) {
      const params = [receipt.subject, receipt.requestId, receipt.agentId, receipt.capability, JSON.stringify(receipt)];
      const inserted = await pool.query(
        'INSERT INTO ' + table + ' (subject,request_id,agent_id,capability,receipt) VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (subject, request_id) DO NOTHING RETURNING receipt',
        params,
      );
      if (inserted.rows.length) return { receipt: inserted.rows[0].receipt, inserted: true };
      const prior = await pool.query(
        'SELECT receipt FROM ' + table + ' WHERE subject=$1 AND request_id=$2',
        [receipt.subject, receipt.requestId],
      );
      if (prior.rows.length !== 1) throw new Error('nous_receipt_race_unresolved');
      return { receipt: prior.rows[0].receipt, inserted: false };
    },
    stats() {
      return { durable: true, backend: 'postgresql', multiWriter: true, encryptedAtRest: 'provider-managed' };
    },
    async close() { await pool.end(); },
  };
}
