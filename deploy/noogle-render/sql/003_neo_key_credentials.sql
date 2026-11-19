-- NEO Key Gate 3 DESIGN ONLY. DO NOT APPLY TO PROD OR STAGING.
-- Postgres table privileges, audit retention, backup/restore and RLS / service
-- separation must be reviewed before deploying. No secrets/biometrics stored.
CREATE TABLE IF NOT EXISTS neo_key_subjects (
  subject_id TEXT PRIMARY KEY,
  user_handle VARCHAR(43) UNIQUE NOT NULL CHECK (user_handle ~ '^[A-Za-z0-9_-]{43}$')
);
CREATE TABLE IF NOT EXISTS neo_key_registration_challenges (
  challenge_hash CHAR(64) PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES neo_key_subjects(subject_id),
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  consumed_at BIGINT,
  enrollment_method TEXT NOT NULL CHECK (enrollment_method IN ('verified-existing-passkey','verified-operator-bootstrap')),
  authorization_ref TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS neo_key_registration_expiry_idx ON neo_key_registration_challenges(expires_at);
CREATE TABLE IF NOT EXISTS neo_key_credentials (
  credential_id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES neo_key_subjects(subject_id),
  rp_id TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  sign_count BIGINT NOT NULL DEFAULT 0 CHECK(sign_count >= 0),
  created_at BIGINT NOT NULL,
  revoked_at BIGINT
);
CREATE INDEX IF NOT EXISTS neo_key_active_owner_idx ON neo_key_credentials(subject_id,rp_id) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS neo_key_audit_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES neo_key_subjects(subject_id),
  credential_id TEXT NOT NULL,
  authorizing_credential_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('enrolled','revoked')),
  created_at BIGINT NOT NULL
);
