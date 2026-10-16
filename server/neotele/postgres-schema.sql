-- NTEL-005: review-only PostgreSQL persistence schema; migration not applied.
CREATE SCHEMA IF NOT EXISTS neotele;
CREATE TABLE IF NOT EXISTS neotele.enrollment_requests (
 id UUID PRIMARY KEY,
 member_id TEXT NOT NULL,
 device_ref TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'REQUESTED',
 provider_id TEXT,
 application_ref TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(member_id,idempotency_key),
 CHECK (status IN ('REQUESTED','ELIGIBILITY_PENDING','ELIGIBLE','PROVIDER_PENDING','READY_FOR_ACTIVATION','ACTIVE','SUSPENDED','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS neotele_enroll_member_idx ON neotele.enrollment_requests(member_id);
CREATE TABLE IF NOT EXISTS neotele.consent_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 member_id TEXT NOT NULL,
 request_id UUID REFERENCES neotele.enrollment_requests(id),
 version TEXT NOT NULL,
 action TEXT NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neotele.audit_outbox (
 id UUID PRIMARY KEY,
 member_id TEXT NOT NULL,
 event_type TEXT NOT NULL,
 payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 published_at TIMESTAMPTZ
);
-- DB roles and row-level security require dedicated policy migration.
-- No profile secrets, IMEI, SSN, benefit proofs or activation QR data stored here.
