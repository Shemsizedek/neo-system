-- Review-only migration; no agent enrollment or production application.
CREATE TABLE neo_relay.agent_keys (
 agent_id text NOT NULL CHECK (length(agent_id) BETWEEN 1 AND 512),
 key_id text NOT NULL CHECK (key_id ~ '^[0-9a-f]{64}$'),
 public_key_spki bytea NOT NULL CHECK (octet_length(public_key_spki) BETWEEN 1 AND 512),
 enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revoked_at timestamptz,
 PRIMARY KEY (agent_id,key_id),
 UNIQUE (key_id),
 CHECK (revoked_at IS NULL OR revoked_at >= enrolled_at)
);
CREATE UNIQUE INDEX agent_one_active_key ON neo_relay.agent_keys(agent_id) WHERE revoked_at IS NULL;
REVOKE ALL ON neo_relay.agent_keys FROM PUBLIC;
-- Enrollment requires authenticated administrator approval, proof of possession,
-- canonical P-256 SPKI validation and SHA-256 fingerprint verification.
-- Rotate by revoking old key and inserting new key in one transaction.
-- Never delete historical keys or store private keys.
-- Completion must lock the active key row in the same transaction as task
-- completion to serialize revocation and prevent stale-key authorization.
