BEGIN;

ALTER TABLE neo_pads_host_payouts
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS neo_pads_host_payouts_status_idx
  ON neo_pads_host_payouts(status, created_at);

DROP TRIGGER IF EXISTS neo_pads_host_payouts_touch ON neo_pads_host_payouts;
CREATE TRIGGER neo_pads_host_payouts_touch
BEFORE UPDATE ON neo_pads_host_payouts
FOR EACH ROW EXECUTE FUNCTION neo_pads_touch_updated_at();

COMMIT;
