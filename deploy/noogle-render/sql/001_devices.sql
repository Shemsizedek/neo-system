-- NSEC-100: schema only; not applied to Render or production.
CREATE TABLE IF NOT EXISTS noogle_connect_devices (
 id UUID PRIMARY KEY,
 subject_id TEXT NOT NULL,
 type TEXT NOT NULL CHECK (type IN ('android','chromebook')),
 label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
 public_key_hash CHAR(64) NOT NULL,
 created_at BIGINT NOT NULL,
 revoked_at BIGINT,
 CONSTRAINT valid_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS noogle_device_active_key
 ON noogle_connect_devices(subject_id,public_key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS noogle_device_owner_idx ON noogle_connect_devices(subject_id);
-- Grant database access only to a dedicated registry role. Revoke public access.
