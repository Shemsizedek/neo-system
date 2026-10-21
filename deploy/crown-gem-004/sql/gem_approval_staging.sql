-- GEM-106: proposed isolated PostgreSQL staging schema, NOT applied automatically.
CREATE TABLE IF NOT EXISTS gem_approval_requests (
 id uuid PRIMARY KEY,
 google_subject_hash text NOT NULL,
 repository text NOT NULL,
 base_branch text NOT NULL,
 head_branch text NOT NULL,
 base_commit char(40) NOT NULL,
 manifest_digest char(64) NOT NULL,
 request_digest char(64) NOT NULL,
 csrf_digest char(64) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','consumed','expired','denied')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS gem_approval_requests_expiry_idx ON gem_approval_requests (expires_at);
CREATE TABLE IF NOT EXISTS gem_approval_audit (
 id uuid PRIMARY KEY,
 request_id uuid REFERENCES gem_approval_requests(id),
 event text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Atomic consume must use a single UPDATE ... WHERE status='confirmed'
-- AND expires_at > now() RETURNING id, inside a transaction with audit insert.
