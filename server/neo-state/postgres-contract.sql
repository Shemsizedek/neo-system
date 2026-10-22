-- Gate 117 PostgreSQL-compatible logical state contract.
-- This schema is portable SQL for an attached PostgreSQL service; its presence does not mean a live database exists.

CREATE TABLE IF NOT EXISTS neo_state_records (
  namespace TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  version BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  digest TEXT NOT NULL,
  PRIMARY KEY (namespace, id)
);

CREATE TABLE IF NOT EXISTS neo_state_journal (
  journal_id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  id TEXT NOT NULL,
  operation TEXT NOT NULL,
  sequence BIGINT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  actor TEXT NOT NULL,
  digest TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_neo_state_journal_object
  ON neo_state_journal(namespace, id, sequence DESC);

CREATE TABLE IF NOT EXISTS neo_schema_migrations (
  version BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  digest TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
