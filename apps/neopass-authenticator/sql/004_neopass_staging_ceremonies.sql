-- CI-only migration. Apply only to a local disposable PostgreSQL 16+ test database.
-- NOT APPROVED for production, persistent staging or public exposure.
CREATE TABLE IF NOT EXISTS neopass_staging_ceremonies (
  binding_hash text PRIMARY KEY CHECK (binding_hash ~ '^[0-9a-f]{64}$'),
  kind text NOT NULL CHECK (kind IN ('registration','authentication')),
  challenge text NOT NULL CHECK (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT neopass_staging_ceremonies_ttl
    CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '5 minutes')
);
CREATE INDEX IF NOT EXISTS neopass_staging_ceremonies_expiration_idx
  ON neopass_staging_ceremonies (expires_at);
-- Runtime user: minimum INSERT/SELECT/UPDATE privileges. Retention cleanup required.
