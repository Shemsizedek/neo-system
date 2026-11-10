import { createHash } from "node:crypto";

// Reuses an existing NEO-owned Postgres/Neon database, without allocating a new service.
// DDL must be applied out of band by a database administrator.
export const BULLETIN_QUEUE_SCHEMA = "neo_bulletin";
export const BULLETIN_QUEUE_TABLE = "neo_bulletin.marketer_queue";

export function validateBulletinDatabaseUrl(databaseUrl) {
  if (typeof databaseUrl !== "string") throw new Error("bulletin_db_url_missing");
  let u;
  try { u = new URL(databaseUrl); } catch { throw new Error("bulletin_db_url_invalid"); }
  if (!["postgres:", "postgresql:"].includes(u.protocol) ||
      !u.hostname.endsWith(".neon.tech") || !u.username || !u.password ||
      u.hash || (u.port && u.port !== "5432")) {
    throw new Error("bulletin_db_url_not_approved_neon");
  }
  return databaseUrl;
}

export async function persistBulletinPostgres(payload, pool) {
  if (!pool || typeof pool.query !== "function") throw new Error("bulletin_db_pool_missing");
  const record = { ...payload, distributionStatus: "pending_editorial_marketing_review" };
  const encoded = JSON.stringify(record);
  const hash = createHash("sha256").update(encoded).digest("hex");
  const insert = await pool.query(
    "INSERT INTO neo_bulletin.marketer_queue (id, payload, payload_sha256, status) " +
    "VALUES ($1, $2::jsonb, $3, 'pending_editorial_marketing_review') " +
    "ON CONFLICT (id) DO NOTHING RETURNING id",
    [payload.id, encoded, hash]
  );
  if (insert.rows?.length === 1) return {status:"queued",id:payload.id,distribution:"not_sent"};
  const lookup = await pool.query(
    "SELECT payload_sha256 FROM neo_bulletin.marketer_queue WHERE id = $1",
    [payload.id]
  );
  if (lookup.rows?.length !== 1) throw new Error("bulletin_db_concurrent_insert_unresolved");
  if (lookup.rows[0].payload_sha256 !== hash) throw new Error("handoff_id_conflict");
  return {status:"already_queued",id:payload.id,distribution:"not_sent"};
}

let cachedPool = null;
let cachedConnectionUrl = null;
export async function getBulletinPostgresPool(databaseUrl) {
  validateBulletinDatabaseUrl(databaseUrl);
  if (cachedPool && cachedConnectionUrl === databaseUrl) return cachedPool;
  if (cachedPool && cachedConnectionUrl !== databaseUrl) throw new Error("bulletin_db_pool_reconfigure_requires_restart");
  // Lazy import: disk-only queue tests and existing Marketer routes remain dependency-free.
  // The deployment image must include the pg package before enabling database-backed intake.
  const pg = await import("pg").catch(() => {throw new Error("bulletin_pg_runtime_dependency_missing");});
  cachedPool = new pg.default.Pool({
    connectionString:databaseUrl,
    ssl:{rejectUnauthorized:true},
    max:3,
    connectionTimeoutMillis:5000,
    idleTimeoutMillis:30000,
    statement_timeout:5000
  });
  cachedConnectionUrl = databaseUrl;
  return cachedPool;
}
