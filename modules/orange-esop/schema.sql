-- Orange ESOP v0.1 additive reference schema.
-- Database-agnostic PostgreSQL-style DDL; adapt through NEO's selected persistence layer.

CREATE TABLE IF NOT EXISTS esop_participants (
  participant_id TEXT PRIMARY KEY,
  legal_name TEXT,
  temple_name TEXT,
  employment_status TEXT NOT NULL,
  employee_class TEXT,
  hire_date DATE,
  chaplaincy_office TEXT,
  royal_council_office TEXT,
  member_status TEXT,
  adept_status BOOLEAN NOT NULL DEFAULT FALSE,
  primary_wallet TEXT,
  beneficiary_status TEXT NOT NULL DEFAULT 'incomplete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stewardship_entries (
  entry_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES esop_participants(participant_id),
  service_date DATE NOT NULL,
  category TEXT NOT NULL,
  activity TEXT NOT NULL,
  hours NUMERIC(12,2),
  office TEXT,
  verified_by TEXT,
  document_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_eligibility (
  participant_id TEXT PRIMARY KEY REFERENCES esop_participants(participant_id),
  eligible BOOLEAN NOT NULL DEFAULT FALSE,
  eligibility_date DATE,
  next_entry_date DATE,
  hours_of_service NUMERIC(12,2),
  years_of_service NUMERIC(8,3),
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_valuations (
  valuation_id TEXT PRIMARY KEY,
  valuation_date DATE NOT NULL,
  employer_security_class TEXT NOT NULL,
  fair_market_value_per_share NUMERIC(38,18) NOT NULL CHECK (fair_market_value_per_share >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  source_document_hash TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_allocations (
  allocation_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES esop_participants(participant_id),
  plan_year INTEGER NOT NULL,
  eligible_compensation NUMERIC(38,18) NOT NULL CHECK (eligible_compensation >= 0),
  allocation_value NUMERIC(38,18) NOT NULL CHECK (allocation_value >= 0),
  employer_shares NUMERIC(38,18) NOT NULL CHECK (employer_shares >= 0),
  neotrust_units NUMERIC(38,18) NOT NULL CHECK (neotrust_units >= 0),
  valuation_id TEXT REFERENCES esop_valuations(valuation_id),
  token_ratio NUMERIC(38,18) CHECK (token_ratio >= 0),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_vesting (
  participant_id TEXT NOT NULL REFERENCES esop_participants(participant_id),
  plan_year INTEGER NOT NULL,
  years_of_service NUMERIC(8,3) NOT NULL,
  vesting_percent NUMERIC(7,4) NOT NULL CHECK (vesting_percent BETWEEN 0 AND 100),
  allocated_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0,
  vested_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0,
  unvested_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL DEFAULT 'NORMAL_VESTING',
  PRIMARY KEY (participant_id, plan_year)
);

CREATE TABLE IF NOT EXISTS orange_esop_registry (
  registry_id TEXT PRIMARY KEY,
  asset TEXT NOT NULL DEFAULT 'NEOTRUST',
  network TEXT NOT NULL DEFAULT 'counterparty',
  reserve_units NUMERIC(38,18),
  suspense_units NUMERIC(38,18),
  allocated_units NUMERIC(38,18),
  unused_authorized_units NUMERIC(38,18),
  token_ratio NUMERIC(38,18),
  underlying_security TEXT,
  underlying_esop_interest NUMERIC(38,18),
  last_reconciled TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING_CAP_TABLE'
);

CREATE TABLE IF NOT EXISTS esop_audit_events (
  event_id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES esop_participants(participant_id),
  event_type TEXT NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  authorized_by TEXT,
  source_document_hash TEXT,
  bitcoin_txid TEXT,
  counterparty_asset TEXT,
  token_quantity NUMERIC(38,18),
  share_quantity NUMERIC(38,18),
  valuation_id TEXT REFERENCES esop_valuations(valuation_id),
  previous_state_hash TEXT,
  current_state_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_reconciliation_runs (
  reconciliation_id TEXT PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reserve_units NUMERIC(38,18) NOT NULL,
  suspense_units NUMERIC(38,18) NOT NULL,
  participant_units NUMERIC(38,18) NOT NULL,
  unused_authorized_units NUMERIC(38,18) NOT NULL,
  represented_underlying_interest NUMERIC(38,18),
  documented_underlying_interest NUMERIC(38,18),
  status TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
