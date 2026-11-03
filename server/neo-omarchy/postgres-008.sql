-- NEO-OMARCHY-008: canonical, independently rehashable audit v2 ledger.
-- Apply ONLY to dedicated non-production neo-omarchy-staging branch.
-- v1 audit history is deliberately untouched: its JSONB did not preserve
-- exact insertion-time serialization, so it cannot be silently "rehashed".
CREATE SCHEMA IF NOT EXISTS neo_omarchy;

CREATE TABLE IF NOT EXISTS neo_omarchy.audit_v2 (
  sequence bigint PRIMARY KEY CHECK (sequence >= 1),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 3 AND 96),
  subject_id text NOT NULL CHECK (length(subject_id) BETWEEN 1 AND 96),
  metadata_json jsonb NOT NULL CHECK (jsonb_typeof(metadata_json) = 'object'),
  occurred_at_ms bigint NOT NULL CHECK (occurred_at_ms > 0),
  previous_hash char(64) NOT NULL UNIQUE CHECK (previous_hash ~ '^[a-f0-9]{64}$'),
  event_hash char(64) NOT NULL UNIQUE CHECK (event_hash ~ '^[a-f0-9]{64}$'),
  canonical_record text NOT NULL CHECK (length(canonical_record) BETWEEN 1 AND 8192),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
-- Runtime must not have UPDATE/DELETE/TRUNCATE/ALTER grants. This trigger
-- adds a second guard against accidental row mutation, not a defense against
-- table owners or PostgreSQL administrators who can modify schema objects.
CREATE OR REPLACE FUNCTION neo_omarchy.deny_audit_v2_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'neo_omarchy_audit_v2_append_only';
END $$;

DROP TRIGGER IF EXISTS audit_v2_append_only ON neo_omarchy.audit_v2;
CREATE TRIGGER audit_v2_append_only
BEFORE UPDATE OR DELETE ON neo_omarchy.audit_v2
FOR EACH ROW EXECUTE FUNCTION neo_omarchy.deny_audit_v2_change();

COMMENT ON TABLE neo_omarchy.audit_v2 IS
  'NEO Omarchy v2 append-only canonical audit events; signed independent witnessing not implied.';
