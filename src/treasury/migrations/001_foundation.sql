-- NEO-TMS G003: PostgreSQL schema foundation. No production migrations applied.
CREATE SCHEMA IF NOT EXISTS neo_treasury;
CREATE TABLE neo_treasury.entities (
 id uuid PRIMARY KEY, entity_type text NOT NULL, display_name text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE neo_treasury.funds (
 id text PRIMARY KEY, label text NOT NULL, restricted boolean NOT NULL DEFAULT true
);
CREATE TABLE neo_treasury.accounts (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 fund_id text NOT NULL REFERENCES neo_treasury.funds(id), currency text NOT NULL,
 account_code text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE neo_treasury.journals (
 id uuid PRIMARY KEY, source_ref text NOT NULL UNIQUE, state text NOT NULL DEFAULT 'DRAFT'
 CHECK(state IN ('DRAFT','POSTED','VOID')),
 created_at timestamptz NOT NULL DEFAULT now(), posted_at timestamptz,
 CHECK ((state='POSTED' AND posted_at IS NOT NULL) OR (state<>'POSTED' AND posted_at IS NULL))
);
CREATE TABLE neo_treasury.journal_lines (
 journal_id uuid NOT NULL REFERENCES neo_treasury.journals(id),
 line_no integer NOT NULL, account_id uuid NOT NULL REFERENCES neo_treasury.accounts(id),
 debit_minor numeric(78,0) NOT NULL DEFAULT 0 CHECK(debit_minor>=0),
 credit_minor numeric(78,0) NOT NULL DEFAULT 0 CHECK(credit_minor>=0),
 PRIMARY KEY(journal_id,line_no),
 CHECK ((debit_minor>0 AND credit_minor=0) OR (credit_minor>0 AND debit_minor=0))
);
CREATE TABLE neo_treasury.approvals (
 id uuid PRIMARY KEY, object_type text NOT NULL, object_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 decision text NOT NULL CHECK(decision IN ('APPROVE','REJECT')),
 decided_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(object_type,object_id,actor_id)
);
CREATE TABLE neo_treasury.assessments (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 temple_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 currency text NOT NULL, amount_minor numeric(78,0) NOT NULL CHECK(amount_minor>0),
 governing_instrument text NOT NULL, due_date date NOT NULL,
 state text NOT NULL CHECK(state IN ('DRAFT','ISSUED','PAID','WAIVED','CANCELLED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE neo_treasury.beneficiary_designations (
 id uuid PRIMARY KEY, beneficiary_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 trust_id uuid NOT NULL REFERENCES neo_treasury.entities(id),
 instrument_ref text NOT NULL, status text NOT NULL CHECK(status IN ('PROPOSED','CONTINGENT','VESTED','REVOKED')),
 effective_date date
);
CREATE TABLE neo_treasury.distribution_requests (
 id uuid PRIMARY KEY, designation_id uuid NOT NULL REFERENCES neo_treasury.beneficiary_designations(id),
 fund_id text NOT NULL REFERENCES neo_treasury.funds(id), currency text NOT NULL,
 amount_minor numeric(78,0) NOT NULL CHECK(amount_minor>0),
 purpose text NOT NULL, state text NOT NULL CHECK(state IN ('DRAFT','PENDING','APPROVED','REJECTED','SETTLED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE neo_treasury.audit_events (
 id uuid PRIMARY KEY, actor_id uuid REFERENCES neo_treasury.entities(id),
 object_type text NOT NULL, object_id uuid NOT NULL, event_type text NOT NULL,
 payload jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
-- Production posting requires a transaction-scoped stored procedure that locks
-- accounts, verifies per-currency balance, two independent approvers, trust
-- restrictions, available funds and audit append, then commits atomically.
-- Revoke direct UPDATE/DELETE on posted records before any production deployment.
