BEGIN;

ALTER TABLE neo_pads_host_payouts
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_reason text,
  ADD COLUMN IF NOT EXISTS operator_note text;

CREATE INDEX IF NOT EXISTS neo_pads_host_payouts_escalation_idx
  ON neo_pads_host_payouts(escalated_at)
  WHERE escalated_at IS NOT NULL;

COMMIT;
