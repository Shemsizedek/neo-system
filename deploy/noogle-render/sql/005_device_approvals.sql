-- NSEC-111: inactive database objects; requires separately reviewed migration.
CREATE TABLE IF NOT EXISTS noogle_connect_approvals (
 id TEXT PRIMARY KEY,
 subject_id TEXT NOT NULL,
 device_id UUID NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('devices.rename','devices.revoke')),
 label TEXT,
 expires_at BIGINT NOT NULL,
 consumed_at BIGINT,
 CHECK ((action='devices.rename' AND label IS NOT NULL) OR (action='devices.revoke' AND label IS NULL))
);
CREATE TABLE IF NOT EXISTS noogle_connect_device_audit (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 approval_id TEXT NOT NULL UNIQUE REFERENCES noogle_connect_approvals(id),
 subject_id TEXT NOT NULL,
 device_id UUID NOT NULL,
 action TEXT NOT NULL,
 occurred_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS noogle_connect_approvals_subject_idx ON noogle_connect_approvals(subject_id,expires_at);
