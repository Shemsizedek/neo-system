-- Gate 9: receipt of actual WordPress publication, separate from human approvals.
-- Apply only through approved staging migrations after protected Neon networking is arranged.
-- Runtime ingestion must have SELECT and INSERT only; no UPDATE, DELETE, or DDL.
CREATE SCHEMA IF NOT EXISTS neo_bulletin;
CREATE TABLE IF NOT EXISTS neo_bulletin.publication_receipts (
  id text PRIMARY KEY,
  post_id bigint NOT NULL CHECK (post_id > 0),
  content_sha256 char(64) NOT NULL,
  receipt jsonb NOT NULL,
  receipt_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulletin_pub_receipt_object CHECK (jsonb_typeof(receipt) = 'object')
);
CREATE INDEX IF NOT EXISTS bulletin_pub_post_idx ON neo_bulletin.publication_receipts (post_id, created_at DESC);
-- Audit records are append-only: supply no UPDATE/DELETE privileges to the runtime role.
