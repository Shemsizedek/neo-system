BEGIN;

ALTER TABLE neo_pads_host_payouts
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS resolution_note text;

CREATE INDEX IF NOT EXISTS neo_pads_host_payouts_unresolved_escalation_idx
  ON neo_pads_host_payouts(escalated_at)
  WHERE escalated_at IS NOT NULL AND resolved_at IS NULL;

COMMIT;
