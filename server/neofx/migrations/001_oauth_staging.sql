-- NEO-FX-051: staging-only OAuth state and encrypted broker token evidence.
-- Apply only on neo-fx-oauth-staging after review; never on shared NEO databases.
CREATE SCHEMA IF NOT EXISTS neofx_auth;

CREATE TABLE IF NOT EXISTS neofx_auth.oauth_state (
  state_hash char(64) PRIMARY KEY,
  tenant_id text NOT NULL,
  subject_id text NOT NULL,
  session_hash char(64) NOT NULL,
  broker text NOT NULL CHECK (broker IN ('alpaca')),
  environment text NOT NULL CHECK (environment='paper'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS oauth_state_expiry_idx ON neofx_auth.oauth_state(expires_at);

CREATE TABLE IF NOT EXISTS neofx_auth.broker_tokens (
  token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  subject_id text NOT NULL,
  broker text NOT NULL CHECK (broker IN ('alpaca')),
  environment text NOT NULL CHECK (environment='paper'),
  encrypted_payload bytea NOT NULL,
  encryption_key_version text NOT NULL,
  nonce bytea NOT NULL CHECK (octet_length(nonce)=12),
  auth_tag bytea NOT NULL CHECK (octet_length(auth_tag)=16),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(tenant_id, subject_id, broker, environment)
);
-- Storage MUST contain only application-layer AES-256-GCM encrypted payloads.
-- Encryption key material and unsealed tokens MUST NOT be written to Postgres.
-- Server queries must be parameterized and bound to verified tenant + subject.
-- Apply only after session verifier, vault key management and audit are reviewed.
