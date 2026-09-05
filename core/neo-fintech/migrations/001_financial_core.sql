-- NEO Fintech Core durable store, PostgreSQL dialect.
-- Financial evidence is append-only. Corrections use linked reversal/adjustment records.

CREATE TABLE IF NOT EXISTS fintech_idempotency (
  principal_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  target_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  provider_operation_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('processing','succeeded','failed_final','ambiguous')),
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (principal_id, operation, target_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS fintech_journals (
  journal_id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  reversal_of TEXT REFERENCES fintech_journals(journal_id)
);

CREATE TABLE IF NOT EXISTS fintech_journal_entries (
  journal_id TEXT NOT NULL REFERENCES fintech_journals(journal_id),
  entry_no INTEGER NOT NULL,
  account TEXT NOT NULL,
  currency TEXT NOT NULL,
  minor_units BIGINT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (journal_id, entry_no)
);

CREATE TABLE IF NOT EXISTS fintech_provider_evidence (
  evidence_id TEXT PRIMARY KEY,
  rail TEXT NOT NULL,
  provider_operation_id TEXT NOT NULL,
  provider_event_id TEXT,
  evidence_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL,
  UNIQUE (rail, provider_event_id)
);

CREATE TABLE IF NOT EXISTS fintech_reconciliation_exceptions (
  exception_id TEXT PRIMARY KEY,
  rail TEXT NOT NULL,
  kind TEXT NOT NULL,
  internal_id TEXT,
  external_id TEXT,
  currency TEXT,
  minor_units BIGINT,
  status TEXT NOT NULL DEFAULT 'open',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
