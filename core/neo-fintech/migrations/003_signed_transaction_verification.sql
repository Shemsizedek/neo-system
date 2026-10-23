-- Signed transaction verification and broadcast authorization evidence.
-- This migration does not enable broadcast or private-key custody.

ALTER TABLE fintech_transaction_reviews
  ADD COLUMN IF NOT EXISTS structure_hash TEXT;

CREATE TABLE IF NOT EXISTS fintech_signed_transaction_verifications (
  verification_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES fintech_transaction_reviews(review_id),
  approval_id TEXT NOT NULL REFERENCES fintech_transaction_approvals(approval_id),
  actor_id TEXT NOT NULL,
  signed_tx_hash TEXT NOT NULL,
  unsigned_structure_hash TEXT NOT NULL,
  signed_structure_hash TEXT NOT NULL,
  decoded_source_ref TEXT NOT NULL,
  decoded_destination_ref TEXT NOT NULL,
  decoded_asset TEXT NOT NULL,
  decoded_quantity_base_units BIGINT NOT NULL,
  decoded_fee_sats BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','rejected')),
  mismatch_reason TEXT,
  verified_at TIMESTAMPTZ NOT NULL,
  UNIQUE (review_id, signed_tx_hash)
);

CREATE TABLE IF NOT EXISTS fintech_broadcast_authorizations (
  authorization_id TEXT PRIMARY KEY,
  verification_id TEXT NOT NULL UNIQUE REFERENCES fintech_signed_transaction_verifications(verification_id),
  review_id TEXT NOT NULL REFERENCES fintech_transaction_reviews(review_id),
  approval_id TEXT NOT NULL REFERENCES fintech_transaction_approvals(approval_id),
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  signed_tx_hash TEXT NOT NULL,
  authorized_at TIMESTAMPTZ NOT NULL
);
