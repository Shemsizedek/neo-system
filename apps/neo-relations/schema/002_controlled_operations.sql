BEGIN;

CREATE TABLE IF NOT EXISTS relations_write_intents (
  intent_id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES relations_tenants(tenant_id) ON DELETE RESTRICT,
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  status text NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','rejected','executed','cancelled','expired')),
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  executed_at timestamptz,
  version bigint NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS relations_write_intents_tenant_status_idx
  ON relations_write_intents(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS relations_write_intents_correlation_idx
  ON relations_write_intents(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS relations_intent_decisions (
  decision_id bigserial PRIMARY KEY,
  intent_id text NOT NULL REFERENCES relations_write_intents(intent_id) ON DELETE RESTRICT,
  tenant_id text NOT NULL REFERENCES relations_tenants(tenant_id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK (decision IN ('approve','reject')),
  approver_type text NOT NULL,
  approver_id text NOT NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(intent_id)
);

CREATE TABLE IF NOT EXISTS relations_router_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  source text NOT NULL,
  tenant_id text NOT NULL REFERENCES relations_tenants(tenant_id) ON DELETE RESTRICT,
  actor_ref text,
  correlation_id text,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  source_fingerprint text
);

CREATE INDEX IF NOT EXISTS relations_router_events_tenant_time_idx
  ON relations_router_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS relations_router_events_correlation_idx
  ON relations_router_events(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS relations_audit_log (
  audit_id bigserial PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES relations_tenants(tenant_id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  resource_type text,
  resource_id text,
  intent_id text,
  correlation_id text,
  outcome text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relations_audit_tenant_time_idx
  ON relations_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS relations_audit_intent_idx
  ON relations_audit_log(intent_id) WHERE intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS relations_audit_correlation_idx
  ON relations_audit_log(correlation_id) WHERE correlation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION relations_prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'relations_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS relations_audit_no_update ON relations_audit_log;
CREATE TRIGGER relations_audit_no_update
BEFORE UPDATE OR DELETE ON relations_audit_log
FOR EACH ROW EXECUTE FUNCTION relations_prevent_audit_mutation();

COMMIT;
