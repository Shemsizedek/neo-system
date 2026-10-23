-- NOMNI-SEO-024 PostgreSQL candidate. Run ONLY through reviewed migrations.
-- External backups, access controls, durable hosting and signing policy required.
BEGIN;
CREATE TABLE IF NOT EXISTS nomni_crown_evidence (
  evidence_hash CHAR(64) PRIMARY KEY,
  asset TEXT NOT NULL CHECK(asset='NOMNI'),
  receipt JSONB NOT NULL,
  signer_key_id TEXT NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  node_confirmation_status TEXT NOT NULL DEFAULT 'unverified',
  rights_status TEXT NOT NULL DEFAULT 'not_verified',
  reserves_status TEXT NOT NULL DEFAULT 'not_verified',
  observed_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (evidence_hash ~ '^[a-f0-9]{64}$')
);
CREATE TABLE IF NOT EXISTS nomni_crown_signer_keys (
  key_id TEXT PRIMARY KEY,
  public_key_pem TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  CHECK(valid_until > valid_from)
);
COMMIT;
