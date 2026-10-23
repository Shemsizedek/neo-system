-- G026 NEO Careers: migration proposal only; never run automatically.
-- Apply only to a dedicated, access-controlled NEO Careers database.
BEGIN;
CREATE SCHEMA IF NOT EXISTS neo_careers;
CREATE TABLE IF NOT EXISTS neo_careers.employer_accounts (
 id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,80}$'),
 subject_id text NOT NULL UNIQUE,
 jurisdiction text NOT NULL,
 verification_status text NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending','verified','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neo_careers.worker_accounts (
 id text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{1,80}$'),
 subject_id text NOT NULL UNIQUE,
 jurisdiction text NOT NULL,
 identity_status text NOT NULL DEFAULT 'pending' CHECK(identity_status IN ('pending','verified','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neo_careers.currency_registry (
 asset text PRIMARY KEY CHECK(asset ~ '^[A-Z0-9._-]{1,48}$'),
 issuer_reference text NOT NULL,
 asset_class text NOT NULL CHECK(asset_class IN ('currency','equity')),
 network text NOT NULL DEFAULT 'bitcoin-counterparty',
 verification_status text NOT NULL DEFAULT 'unverified' CHECK(verification_status IN ('unverified','verified','rejected')),
 verifier_receipt jsonb,
 verified_at timestamptz,
 CHECK ((verification_status = 'verified' AND verifier_receipt IS NOT NULL AND verified_at IS NOT NULL) OR verification_status <> 'verified')
);
CREATE TABLE IF NOT EXISTS neo_careers.payroll_obligations (
 id text PRIMARY KEY,
 idempotency_key text NOT NULL UNIQUE,
 employer_id text NOT NULL REFERENCES neo_careers.employer_accounts(id),
 worker_id text NOT NULL REFERENCES neo_careers.worker_accounts(id),
 task_id text NOT NULL,
 asset text NOT NULL REFERENCES neo_careers.currency_registry(asset),
 units numeric(38,8) NOT NULL CHECK (units > 0),
 fiat_reference text NOT NULL,
 jurisdiction text NOT NULL,
 status text NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','review','blocked','approved','cancelled')),
 payroll_legal_review text NOT NULL DEFAULT 'pending',
 funding_verified boolean NOT NULL DEFAULT false,
 worker_consent_verified boolean NOT NULL DEFAULT false,
 signing_enabled boolean NOT NULL DEFAULT false CHECK(signing_enabled = false),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neo_careers.ledger_events (
 event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 obligation_id text NOT NULL REFERENCES neo_careers.payroll_obligations(id),
 event_type text NOT NULL,
 actor_subject text NOT NULL,
 event_digest char(64) NOT NULL CHECK(event_digest ~ '^[a-f0-9]{64}$'),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_events_obligation_index ON neo_careers.ledger_events(obligation_id,event_id);
-- Deployment role should have no UPDATE/DELETE on ledger_events, and row-level policies must be configured before service access.
COMMIT;
