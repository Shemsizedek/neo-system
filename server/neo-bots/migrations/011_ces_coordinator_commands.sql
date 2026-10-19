-- NEO-CES-011: isolated coordinator command ledger (PostgreSQL)
-- Apply only to the authorized NEO Bank staging database.
CREATE TABLE IF NOT EXISTS neo_ces_commands (
  organization_id text NOT NULL,
  command_id text NOT NULL,
  coordinator_id text NOT NULL,
  exchange_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','approval-required','unverified','verified-receipt','failed-review-required')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, command_id)
);
CREATE TABLE IF NOT EXISTS neo_ces_receipts (
  organization_id text NOT NULL,
  command_id text NOT NULL,
  disposition text NOT NULL,
  accounting_eligible boolean NOT NULL DEFAULT false,
  legacy_reference text,
  evidence_reference text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, command_id),
  FOREIGN KEY (organization_id, command_id)
    REFERENCES neo_ces_commands (organization_id, command_id),
  CHECK (NOT accounting_eligible OR
    (disposition = 'verified-receipt' AND legacy_reference IS NOT NULL AND evidence_reference IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS neo_ces_commands_coordinator_idx
  ON neo_ces_commands (organization_id, coordinator_id, created_at DESC);
