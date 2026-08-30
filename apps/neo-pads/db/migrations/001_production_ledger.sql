BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS neo_pads_properties (
  id text PRIMARY KEY,
  host_wallet text NOT NULL,
  title text NOT NULL,
  location text NOT NULL,
  price_world numeric(30,8) NOT NULL CHECK (price_world >= 0),
  property_authority_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('PENDING','ACTIVE','SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS neo_pads_bookings (
  id text PRIMARY KEY,
  property_id text NOT NULL REFERENCES neo_pads_properties(id),
  member_neopass_id text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  stay_window tstzrange GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  amount_world numeric(30,8) NOT NULL CHECK (amount_world >= 0),
  state text NOT NULL,
  entitlement_status text NOT NULL CHECK (entitlement_status IN ('PENDING','ACTIVE','EXPIRED','REVOKED')),
  checkout_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE neo_pads_bookings
  DROP CONSTRAINT IF EXISTS neo_pads_no_overlapping_bookings;

ALTER TABLE neo_pads_bookings
  ADD CONSTRAINT neo_pads_no_overlapping_bookings
  EXCLUDE USING gist (
    property_id WITH =,
    stay_window WITH &&
  )
  WHERE (state IN ('RESERVED','PAYMENT_PENDING','CONFIRMED','ACCESS_READY','CHECKED_IN','ACTIVE_STAY'));

CREATE TABLE IF NOT EXISTS neo_pads_wallet_verifications (
  wallet text PRIMARY KEY,
  challenge_id text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS neo_pads_payment_events (
  event_id text PRIMARY KEY,
  booking_id text REFERENCES neo_pads_bookings(id),
  provider text NOT NULL DEFAULT 'NEO_COUNTER',
  event_type text NOT NULL,
  external_reference text,
  payload_sha256 text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS neo_pads_payments (
  id text PRIMARY KEY,
  booking_id text NOT NULL REFERENCES neo_pads_bookings(id),
  checkout_id text,
  commercial_amount_world numeric(30,8) NOT NULL,
  settlement_asset text CHECK (settlement_asset IN ('BTC','XCP','NOMNI')),
  network_amount numeric(40,16),
  network_fee numeric(40,16),
  platform_fee_world numeric(30,8),
  status text NOT NULL,
  txid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS neo_pads_host_payouts (
  id text PRIMARY KEY,
  booking_id text NOT NULL UNIQUE REFERENCES neo_pads_bookings(id),
  host_wallet text NOT NULL,
  settlement_asset text NOT NULL CHECK (settlement_asset IN ('BTC','XCP','NOMNI')),
  amount numeric(40,16) NOT NULL CHECK (amount >= 0),
  status text NOT NULL CHECK (status IN ('PENDING','AUTHORIZED','SUBMITTED','SETTLED','FAILED','REVERSED')),
  txid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);

CREATE TABLE IF NOT EXISTS neo_pads_audit_log (
  id bigserial PRIMARY KEY,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id text,
  previous_state jsonb,
  next_state jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS neo_pads_bookings_property_idx ON neo_pads_bookings(property_id);
CREATE INDEX IF NOT EXISTS neo_pads_bookings_member_idx ON neo_pads_bookings(member_neopass_id);
CREATE INDEX IF NOT EXISTS neo_pads_payment_booking_idx ON neo_pads_payments(booking_id);
CREATE INDEX IF NOT EXISTS neo_pads_audit_aggregate_idx ON neo_pads_audit_log(aggregate_type, aggregate_id, occurred_at);

CREATE OR REPLACE FUNCTION neo_pads_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS neo_pads_properties_touch ON neo_pads_properties;
CREATE TRIGGER neo_pads_properties_touch
BEFORE UPDATE ON neo_pads_properties
FOR EACH ROW EXECUTE FUNCTION neo_pads_touch_updated_at();

DROP TRIGGER IF EXISTS neo_pads_bookings_touch ON neo_pads_bookings;
CREATE TRIGGER neo_pads_bookings_touch
BEFORE UPDATE ON neo_pads_bookings
FOR EACH ROW EXECUTE FUNCTION neo_pads_touch_updated_at();

COMMIT;
