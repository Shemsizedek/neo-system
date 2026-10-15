-- NSEC-102: install only in an isolated staging PostgreSQL database.
CREATE TABLE IF NOT EXISTS noogle_connect_enrollment_challenges (
  challenge_id text PRIMARY KEY,
  subject text NOT NULL,
  public_key_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS noogle_connect_devices (
  id uuid PRIMARY KEY,
  subject text NOT NULL,
  type text NOT NULL CHECK (type IN ('android','chromebook')),
  label text NOT NULL,
  public_key_hash text NOT NULL,
  created_at bigint NOT NULL,
  revoked_at bigint
);
CREATE UNIQUE INDEX IF NOT EXISTS noogle_connect_active_owner_key
  ON noogle_connect_devices(subject,public_key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS noogle_connect_devices_subject ON noogle_connect_devices(subject);
