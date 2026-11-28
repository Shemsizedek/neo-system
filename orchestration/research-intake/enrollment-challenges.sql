-- Review-only migration, after task-registry.sql and agent-keys.sql.
CREATE TABLE neo_relay.enrollment_challenges (
 nonce text PRIMARY KEY CHECK (nonce ~ '^[0-9a-f]{64}$'),
 agent_id text NOT NULL CHECK (length(agent_id) BETWEEN 1 AND 512),
 expires_at_ms bigint NOT NULL,
 approved_by text NOT NULL CHECK (length(approved_by) BETWEEN 1 AND 512),
 consumed_at timestamptz
);
REVOKE ALL ON neo_relay.enrollment_challenges FROM PUBLIC;
-- Trusted administrator approval and proof of possession required.
-- Within one transaction, load challenge FOR UPDATE, verify signature against
-- stored agent_id, nonce and expires_at_ms, then consume using:
-- UPDATE neo_relay.enrollment_challenges SET consumed_at=clock_timestamp()
-- WHERE nonce=$1 AND agent_id=$2 AND consumed_at IS NULL
-- AND expires_at_ms > extract(epoch FROM clock_timestamp())*1000
-- RETURNING nonce;
-- Require exactly one returned row, insert validated public key,
-- and commit both operations together. Roll back on any failure.
