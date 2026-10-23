-- NTEL-011: proposed migration ONLY. Apply after role and RLS review.
CREATE TABLE IF NOT EXISTS neotele.evidence_records (
 reference TEXT PRIMARY KEY,
 evidence_type TEXT NOT NULL,
 digest TEXT NOT NULL CHECK (digest ~ '^sha256:[0-9a-f]{64}$'),
 submitter TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','APPROVED','REJECTED')),
 reviewer TEXT,
 approval_id TEXT,
 revision BIGINT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 reviewed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS neotele.evidence_audit (
 event_id UUID PRIMARY KEY,
 reference TEXT NOT NULL REFERENCES neotele.evidence_records(reference),
 actor TEXT NOT NULL,
 action TEXT NOT NULL,
 digest TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Secure writes with least-privilege DB roles and row-level policies.
-- Approval records reference evidence digests; Crown Chain anchoring requires separately verified receipts.
