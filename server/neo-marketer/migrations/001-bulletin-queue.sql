-- Apply explicitly with an approved database administrator role on a verified NEO-owned Neon database.
-- Never run migrations automatically from the public HTTP intake service.
-- Runtime role should receive only SELECT, INSERT on this table (not UPDATE, DELETE, or DDL).
CREATE SCHEMA IF NOT EXISTS neo_bulletin;
CREATE TABLE IF NOT EXISTS neo_bulletin.marketer_queue (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  payload_sha256 char(64) NOT NULL,
  status text NOT NULL DEFAULT 'pending_editorial_marketing_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulletin_marketer_pending_only CHECK (status = 'pending_editorial_marketing_review'),
  CONSTRAINT bulletin_marketer_payload_object CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX IF NOT EXISTS bulletin_marketer_created_at_idx
  ON neo_bulletin.marketer_queue (created_at DESC);
