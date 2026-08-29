-- NEOpay transaction review and approval evidence.
-- Approval never stores or implies a private key, signature, or broadcast result.

CREATE TABLE IF NOT EXISTS fintech_transaction_reviews (
  review_id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL UNIQUE,
  source_ref TEXT NOT NULL,
  destination_ref TEXT NOT NULL,
  asset TEXT NOT NULL,
  quantity_base_units BIGINT NOT NULL CHECK (quantity_base_units > 0),
  fee_sats BIGINT NOT NULL CHECK (fee_sats >= 0),
  decoded_source_ref TEXT NOT NULL,
  decoded_destination_ref TEXT NOT NULL,
  decoded_asset TEXT NOT NULL,
  decoded_quantity_base_units BIGINT NOT NULL,
  decoded_fee_sats BIGINT NOT NULL,
  unsigned_tx_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review','verified','rejected','approved_for_external_signing')),
  mismatch_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fintech_transaction_approvals (
  approval_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES fintech_transaction_reviews(review_id),
  actor_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  unsigned_tx_hash TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  UNIQUE (review_id)
);

CREATE TABLE IF NOT EXISTS fintech_signer_handoffs (
  handoff_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES fintech_transaction_reviews(review_id),
  approval_id TEXT NOT NULL REFERENCES fintech_transaction_approvals(approval_id),
  unsigned_tx_hash TEXT NOT NULL,
  destination TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id)
);
