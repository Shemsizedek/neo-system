-- Orange ESOP v0.1 additive reference schema.
-- PostgreSQL-style DDL; adapt through NEO's selected persistence layer.

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
  hours NUMERIC(12,2) CHECK (hours IS NULL OR hours >= 0),
  office TEXT,
  verified_by TEXT,
  document_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_eligibility (
  participant_id TEXT NOT NULL REFERENCES esop_participants(participant_id),
  plan_year INTEGER NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT FALSE,
  eligibility_date DATE,
  next_entry_date DATE,
  hours_of_service NUMERIC(12,2) CHECK (hours_of_service IS NULL OR hours_of_service >= 0),
  years_of_service NUMERIC(8,3) CHECK (years_of_service IS NULL OR years_of_service >= 0),
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (participant_id, plan_year)
);

CREATE TABLE IF NOT EXISTS esop_vesting_schedules (
  schedule_id TEXT PRIMARY KEY,
  plan_year INTEGER NOT NULL,
  schedule_json JSONB NOT NULL,
  source_document_hash TEXT NOT NULL,
  adopted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'adopted'
);

CREATE TABLE IF NOT EXISTS esop_valuations (
  valuation_id TEXT PRIMARY KEY,
  valuation_date DATE NOT NULL,
  employer_security_class TEXT NOT NULL,
  fair_market_value_per_share NUMERIC(38,18) NOT NULL CHECK (fair_market_value_per_share > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  source_document_hash TEXT,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_allocations (
  allocation_id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  plan_year INTEGER NOT NULL,
  eligible_compensation NUMERIC(38,18) NOT NULL CHECK (eligible_compensation >= 0),
  allocation_value NUMERIC(38,18) NOT NULL CHECK (allocation_value >= 0),
  employer_shares NUMERIC(38,18) NOT NULL CHECK (employer_shares >= 0),
  neotrust_units NUMERIC(38,18) NOT NULL CHECK (neotrust_units >= 0),
  valuation_id TEXT NOT NULL REFERENCES esop_valuations(valuation_id),
  token_ratio NUMERIC(38,18) NOT NULL CHECK (token_ratio >= 0),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id, plan_year)
    REFERENCES esop_eligibility(participant_id, plan_year)
);

CREATE TABLE IF NOT EXISTS esop_vesting (
  participant_id TEXT NOT NULL REFERENCES esop_participants(participant_id),
  plan_year INTEGER NOT NULL,
  schedule_id TEXT NOT NULL REFERENCES esop_vesting_schedules(schedule_id),
  years_of_service NUMERIC(8,3) NOT NULL CHECK (years_of_service >= 0),
  vesting_percent NUMERIC(7,4) NOT NULL CHECK (vesting_percent BETWEEN 0 AND 100),
  allocated_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (allocated_neotrust >= 0),
  vested_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (vested_neotrust >= 0),
  unvested_neotrust NUMERIC(38,18) NOT NULL DEFAULT 0 CHECK (unvested_neotrust >= 0),
  event_type TEXT NOT NULL DEFAULT 'NORMAL_VESTING',
  PRIMARY KEY (participant_id, plan_year),
  CHECK (vested_neotrust + unvested_neotrust = allocated_neotrust)
);

CREATE TABLE IF NOT EXISTS orange_esop_registry (
  registry_id TEXT PRIMARY KEY,
  asset TEXT NOT NULL DEFAULT 'NEOTRUST',
  network TEXT NOT NULL DEFAULT 'counterparty',
  reserve_units NUMERIC(38,18) CHECK (reserve_units IS NULL OR reserve_units >= 0),
  suspense_units NUMERIC(38,18) CHECK (suspense_units IS NULL OR suspense_units >= 0),
  allocated_units NUMERIC(38,18) CHECK (allocated_units IS NULL OR allocated_units >= 0),
  unused_authorized_units NUMERIC(38,18) CHECK (unused_authorized_units IS NULL OR unused_authorized_units >= 0),
  token_ratio NUMERIC(38,18) CHECK (token_ratio IS NULL OR token_ratio >= 0),
  underlying_security TEXT,
  underlying_esop_interest NUMERIC(38,18) CHECK (underlying_esop_interest IS NULL OR underlying_esop_interest >= 0),
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
  token_quantity NUMERIC(38,18) CHECK (token_quantity IS NULL OR token_quantity >= 0),
  share_quantity NUMERIC(38,18) CHECK (share_quantity IS NULL OR share_quantity >= 0),
  valuation_id TEXT REFERENCES esop_valuations(valuation_id),
  previous_state_hash TEXT,
  current_state_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esop_reconciliation_runs (
  reconciliation_id TEXT PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reserve_units NUMERIC(38,18) NOT NULL CHECK (reserve_units >= 0),
  suspense_units NUMERIC(38,18) NOT NULL CHECK (suspense_units >= 0),
  participant_units NUMERIC(38,18) NOT NULL CHECK (participant_units >= 0),
  unused_authorized_units NUMERIC(38,18) NOT NULL CHECK (unused_authorized_units >= 0),
  represented_underlying_interest NUMERIC(38,18) NOT NULL CHECK (represented_underlying_interest >= 0),
  documented_underlying_interest NUMERIC(38,18) NOT NULL CHECK (documented_underlying_interest >= 0),
  status TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);
