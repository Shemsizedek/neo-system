-- Bitcoin Core consensus/policy validation and controlled broadcast attempts.
-- A broadcast attempt is persisted before sendrawtransaction is invoked.

CREATE TABLE IF NOT EXISTS fintech_bitcoin_consensus_validations (
  validation_id TEXT PRIMARY KEY,
  verification_id TEXT NOT NULL UNIQUE REFERENCES fintech_signed_transaction_verifications(verification_id),
  review_id TEXT NOT NULL REFERENCES fintech_transaction_reviews(review_id),
  approval_id TEXT NOT NULL REFERENCES fintech_transaction_approvals(approval_id),
  actor_id TEXT NOT NULL,
  signed_tx_hash TEXT NOT NULL,
  txid TEXT NOT NULL,
  wtxid TEXT,
  allowed BOOLEAN NOT NULL,
  vsize BIGINT NOT NULL DEFAULT 0 CHECK (vsize >= 0),
  reject_reason TEXT,
  reject_details TEXT,
  validated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE fintech_broadcast_authorizations
  ADD COLUMN IF NOT EXISTS validation_id TEXT REFERENCES fintech_bitcoin_consensus_validations(validation_id);

CREATE UNIQUE INDEX IF NOT EXISTS fintech_broadcast_authorizations_validation_uidx
  ON fintech_broadcast_authorizations(validation_id)
  WHERE validation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS fintech_broadcast_attempts (
  attempt_id TEXT PRIMARY KEY,
  authorization_id TEXT NOT NULL UNIQUE REFERENCES fintech_broadcast_authorizations(authorization_id),
  validation_id TEXT NOT NULL REFERENCES fintech_bitcoin_consensus_validations(validation_id),
  actor_id TEXT NOT NULL,
  provider_operation_id TEXT NOT NULL,
  signed_tx_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('prepared','accepted','rejected','ambiguous')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (provider_operation_id, signed_tx_hash)
);
