-- NSEC-103 migration ONLY. Do not apply to public Render staging yet.
CREATE TABLE IF NOT EXISTS noogle_connect_challenges (
 challenge_hash CHAR(64) PRIMARY KEY,
 subject_id TEXT NOT NULL,
 credential_id TEXT,
 purpose TEXT NOT NULL CHECK (purpose IN ('register','authenticate')),
 rp_id TEXT NOT NULL,
 origin TEXT NOT NULL,
 expires_at BIGINT NOT NULL,
 consumed_at BIGINT
);
CREATE INDEX IF NOT EXISTS noogle_connect_challenge_expiry_idx ON noogle_connect_challenges(expires_at);
-- Challenge matching and consumption MUST happen in one atomic statement.
