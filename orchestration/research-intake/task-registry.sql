-- Isolated staging schema. Apply only after review; no public access.
CREATE SCHEMA neo_relay;
CREATE TABLE neo_relay.tasks (
 task_id text PRIMARY KEY CHECK (length(task_id) BETWEEN 1 AND 512),
 payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','CLAIMED','COMPLETED','HOLD')),
 owner_id text,
 claimed_at timestamptz,
 receipt_hash text CHECK (receipt_hash ~ '^[0-9a-f]{64}$'),
 CHECK ((state = 'QUEUED' AND owner_id IS NULL AND claimed_at IS NULL AND receipt_hash IS NULL)
 OR (state = 'CLAIMED' AND owner_id IS NOT NULL AND claimed_at IS NOT NULL AND receipt_hash IS NULL)
 OR (state = 'COMPLETED' AND owner_id IS NOT NULL AND claimed_at IS NOT NULL AND receipt_hash IS NOT NULL)
 OR state = 'HOLD')
);
-- Parameterized statements for trusted adapter only:
-- Register: INSERT INTO neo_relay.tasks(task_id,payload_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING;
-- Read existing payload_hash and reject mismatches before any claim.
-- Claim: UPDATE neo_relay.tasks SET state='CLAIMED',owner_id=$2,claimed_at=clock_timestamp()
-- WHERE task_id=$1 AND state='QUEUED' AND payload_hash=$3 RETURNING task_id;
-- Complete only after independent signature and validation checks:
-- UPDATE neo_relay.tasks SET state='COMPLETED',receipt_hash=$3
-- WHERE task_id=$1 AND owner_id=$2 AND state='CLAIMED' RETURNING task_id;
-- No automatic lease expiry: uncertain side effects require reconciliation before retry.
REVOKE ALL ON SCHEMA neo_relay FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA neo_relay FROM PUBLIC;
