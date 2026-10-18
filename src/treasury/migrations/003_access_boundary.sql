-- G008 defense-in-depth database authorization scaffolding.
-- Apply only in isolated staging after migration review.
CREATE TABLE IF NOT EXISTS neo_treasury.role_grants (
 actor_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 temple_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 role text NOT NULL CHECK (role IN ('TRUSTEE','TREASURER','ERA_OFFICER','AUDITOR')),
 granted_by uuid NOT NULL REFERENCES neo_treasury.entities(id),
 granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 PRIMARY KEY(actor_id,temple_id,role)
);
CREATE TABLE IF NOT EXISTS neo_treasury.posting_attempts (
 id uuid PRIMARY KEY, journal_id uuid NOT NULL REFERENCES neo_treasury.journals(id),
 requested_by uuid NOT NULL REFERENCES neo_treasury.entities(id),
 requested_at timestamptz NOT NULL DEFAULT now(),
 outcome text NOT NULL CHECK(outcome IN ('REQUESTED','DENIED','POSTED')),
 reason text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_treasury_approval_object ON neo_treasury.approvals(object_type,object_id,decision);
CREATE INDEX IF NOT EXISTS idx_treasury_journal_line_account ON neo_treasury.journal_lines(account_id);
-- Enable row-level security; without policies ordinary app roles cannot read rows.
ALTER TABLE neo_treasury.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.beneficiary_designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.distribution_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.role_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.posting_attempts ENABLE ROW LEVEL SECURITY;
-- FORCE RLS also applies to table owners; privileged BYPASSRLS roles still bypass.
ALTER TABLE neo_treasury.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.assessments FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.beneficiary_designations FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.distribution_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.journals FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.journal_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE neo_treasury.audit_events FORCE ROW LEVEL SECURITY;
-- NO permissive policies are installed: fail closed until authenticated
-- identity mapping, temple isolation, GRANT/REVOKE, immutable audit and
-- SECURITY DEFINER review have been implemented and independently tested.
-- G004 post_journal remains intentionally disabled.
