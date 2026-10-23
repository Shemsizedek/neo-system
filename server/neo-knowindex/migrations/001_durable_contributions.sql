-- KI-015 controlled knowledge contributions.
-- Apply ONLY with an explicitly authorized, isolated persistent PostgreSQL database
-- and a separately backed-up/restore-tested storage plan.
-- Never run on neo-pads-production or noogle-connect-dev.
-- Migration is idempotent and does not backfill, publish or enable knowledge writes.

CREATE SCHEMA IF NOT EXISTS knowindex;
REVOKE ALL ON SCHEMA knowindex FROM PUBLIC;

CREATE TABLE IF NOT EXISTS knowindex.contributions (
  id UUID PRIMARY KEY,
  actor_subject TEXT NOT NULL,
  request_key TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  description TEXT NOT NULL,
  attribution TEXT NOT NULL,
  community TEXT,
  source_class TEXT NOT NULL CHECK(source_class IN ('community','primary','scholarly','reference','archive','other')),
  rights_basis TEXT NOT NULL CHECK(rights_basis IN ('original-with-permission','licensed','public-domain','link-only')),
  rights_statement TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('submitted','validated','attributed','approved','disputed','removed')),
  version INTEGER NOT NULL CHECK(version > 0),
  payload_sha256 CHAR(64) NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(actor_subject, request_key)
);

CREATE INDEX IF NOT EXISTS idx_knowindex_contributions_owner_time
  ON knowindex.contributions(actor_subject, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowindex_contributions_state_time
  ON knowindex.contributions(state, created_at DESC);

CREATE TABLE IF NOT EXISTS knowindex.events (
  seq BIGSERIAL PRIMARY KEY,
  contribution_id UUID NOT NULL REFERENCES knowindex.contributions(id),
  action TEXT NOT NULL,
  actor_subject TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  previous_hash CHAR(64) NOT NULL,
  event_hash CHAR(64) NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_knowindex_events_contribution
  ON knowindex.events(contribution_id, seq);

CREATE OR REPLACE FUNCTION knowindex.reject_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append_only_audit';
END
$$;

DROP TRIGGER IF EXISTS knowindex_events_no_update ON knowindex.events;
DROP TRIGGER IF EXISTS knowindex_events_no_delete ON knowindex.events;
CREATE TRIGGER knowindex_events_no_update
  BEFORE UPDATE ON knowindex.events
  FOR EACH ROW EXECUTE FUNCTION knowindex.reject_event_mutation();
CREATE TRIGGER knowindex_events_no_delete
  BEFORE DELETE ON knowindex.events
  FOR EACH ROW EXECUTE FUNCTION knowindex.reject_event_mutation();

-- A dedicated runtime role MUST receive only schema USAGE, SELECT/INSERT on
-- events (NOT UPDATE/DELETE), SELECT/INSERT/UPDATE on contributions, and USAGE
-- on events_seq_seq. Grant after checking the actual role and database.
-- Do not grant schema ownership, CREATE permissions, or migration powers
-- to the public-facing runtime role.
