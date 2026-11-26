-- Gate 7. Apply only on approved NEO-owned Neon staging branch.
-- Separate pre-publication review receipts from post-publication Marketer queue.
-- Runtime role: INSERT/SELECT only; migration role retains DDL.
CREATE SCHEMA IF NOT EXISTS neo_bulletin;
CREATE TABLE IF NOT EXISTS neo_bulletin.editorial_approvals (
  id text PRIMARY KEY,
  post_id bigint NOT NULL CHECK (post_id > 0),
  content_sha256 char(64) NOT NULL,
  approval jsonb NOT NULL,
  approval_sha256 char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulletin_approvals_json_object CHECK (jsonb_typeof(approval) = 'object')
);
CREATE INDEX IF NOT EXISTS bulletin_editorial_approvals_post_idx
  ON neo_bulletin.editorial_approvals (post_id, created_at DESC);
-- No DELETE or UPDATE grants. Enforce append-only at the application layer,
-- and provision a separate least-privilege role without UPDATE/DELETE.
