BEGIN;

ALTER TABLE neo_pads_host_payouts
  ADD COLUMN IF NOT EXISTS provider_payout_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reconciled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS neo_pads_host_payouts_provider_id_uq
  ON neo_pads_host_payouts(provider_payout_id)
  WHERE provider_payout_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS neo_pads_host_payouts_reconcile_idx
  ON neo_pads_host_payouts(status, last_reconciled_at, created_at);

COMMIT;
