-- NSEC-106: activate only after verified NEO Pass/WebAuthn and database review.
-- One atomic transaction consumes a scoped challenge and enrolls its verified device.
-- All statement arguments are bound parameters; caller identity and proof must be server-verified.
BEGIN;
WITH consumed AS (
 UPDATE noogle_connect_challenges SET consumed_at=$8
 WHERE challenge_hash=$1 AND subject_id=$2 AND credential_id IS NOT DISTINCT FROM $3
 AND purpose='register' AND rp_id=$4 AND origin=$5
 AND expires_at>$8 AND consumed_at IS NULL
 RETURNING subject_id
)
INSERT INTO noogle_connect_devices(id,subject_id,type,label,public_key_hash,created_at,revoked_at)
SELECT $6, subject_id, $7, $9, $10, $8, NULL FROM consumed
RETURNING id;
-- Caller MUST ROLLBACK unless exactly one row returned.
COMMIT;
