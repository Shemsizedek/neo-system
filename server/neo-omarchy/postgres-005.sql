-- NEO-OMARCHY-005 — staging-only migration, runs after postgres-leases.sql.
-- Do not run on any existing production database. Machine public keys must be
-- operator-enrolled and cryptographically bound to NEOpass before real use.
ALTER TABLE neo_omarchy.machines
  ADD COLUMN IF NOT EXISTS signing_public_key text;
CREATE TABLE IF NOT EXISTS neo_omarchy.machine_replay (
  machine_id text NOT NULL REFERENCES neo_omarchy.machines(machine_id),
  nonce char(64) NOT NULL CHECK (nonce ~ '^[a-f0-9]{64}$'),
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (machine_id, nonce)
);
CREATE TABLE IF NOT EXISTS neo_omarchy.operator_replay (
  subject_id text NOT NULL,
  nonce char(64) NOT NULL CHECK (nonce ~ '^[a-f0-9]{64}$'),
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, nonce)
);
-- Replay records are intentionally NOT automatically deleted. Review retention
-- and partition/archival policy before moving beyond the isolated pilot.
