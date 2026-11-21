-- Apply only to isolated test DB after review; no fax or document contents.
CREATE TABLE IF NOT EXISTS neo_efax_requests (
 id UUID PRIMARY KEY,
 tenant_id TEXT NOT NULL CHECK (length(tenant_id) BETWEEN 1 AND 128),
 owner_id TEXT NOT NULL CHECK (length(owner_id) BETWEEN 1 AND 128),
 purpose VARCHAR(200) NOT NULL CHECK (length(trim(purpose)) > 0),
 status TEXT NOT NULL CHECK (status IN ('SUBMITTED','REVIEW_PENDING','APPROVED','REJECTED')),
 idempotency_key VARCHAR(128) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL,
 version INTEGER NOT NULL CHECK (version > 0),
 UNIQUE (tenant_id,owner_id,idempotency_key),
 UNIQUE (tenant_id,id)
);
CREATE TABLE IF NOT EXISTS neo_efax_audit (
 event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 tenant_id TEXT NOT NULL,
 request_id UUID NOT NULL,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK (action IN ('SUBMITTED','REVIEW_PENDING','APPROVED','REJECTED')),
 occurred_at TIMESTAMPTZ NOT NULL,
 FOREIGN KEY (tenant_id,request_id) REFERENCES neo_efax_requests (tenant_id,id)
);
CREATE INDEX IF NOT EXISTS neo_efax_audit_by_request ON neo_efax_audit (tenant_id,request_id,event_id);
-- The service DB role must not UPDATE, DELETE or TRUNCATE the audit table.
