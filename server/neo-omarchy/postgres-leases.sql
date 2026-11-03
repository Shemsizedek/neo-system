-- NEO-OMARCHY-004: reviewed pilot schema only; never auto-applied.
-- Requires dedicated PostgreSQL database, restricted role, encrypted transport,
-- backups and explicit migration approval. No public API or secrets are created.
CREATE SCHEMA IF NOT EXISTS neo_omarchy;

CREATE TABLE IF NOT EXISTS neo_omarchy.machines (
  machine_id text PRIMARY KEY CHECK (machine_id ~ '^neo:machine:[a-z0-9][a-z0-9-]{0,63}$'),
  state text NOT NULL CHECK (state IN ('pending','approved','revoked')),
  proof_id char(64) UNIQUE NOT NULL,
  issuer_key_fingerprint char(64) NOT NULL,
  proof_expires_at timestamptz NOT NULL,
  approved_by text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS neo_omarchy.tasks (
  task_id text PRIMARY KEY CHECK (task_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$'),
  capability text NOT NULL DEFAULT 'local-inference' CHECK (capability = 'local-inference'),
  objective text NOT NULL CHECK (char_length(objective) BETWEEN 1 AND 2000),
  max_tokens integer NOT NULL CHECK (max_tokens BETWEEN 1 AND 512),
  state text NOT NULL CHECK (state IN ('queued','leased','completed','failed','needs-review')),
  approved_by text NOT NULL,
  machine_id text REFERENCES neo_omarchy.machines(machine_id),
  lease_hash char(64),
  lease_expires_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 1),
  result_digest char(64),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS neo_omarchy_tasks_queue ON neo_omarchy.tasks(state,created_at,task_id);
CREATE INDEX IF NOT EXISTS neo_omarchy_tasks_machine ON neo_omarchy.tasks(machine_id,state);

CREATE TABLE IF NOT EXISTS neo_omarchy.audit_events (
  seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL,
  subject_id text NOT NULL,
  metadata_json jsonb NOT NULL,
  previous_hash char(64) NOT NULL,
  event_hash char(64) UNIQUE NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
-- A serializing advisory transaction lock in the repository is necessary to
-- avoid concurrent writers forking the hash chain. No trigger/witness yet.

-- Apply least-privilege GRANTs in a separately reviewed migration.
-- Do not grant schema ownership or machine/table DDL to runtime credentials.
