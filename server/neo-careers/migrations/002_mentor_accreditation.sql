-- HR042 review-only migration proposal. Not applied automatically.
BEGIN;
CREATE SCHEMA IF NOT EXISTS neo_education;
CREATE TABLE IF NOT EXISTS neo_education.mentor_accreditation (
  mentor_subject text PRIMARY KEY,
  track text NOT NULL,
  identity_reviewed boolean NOT NULL DEFAULT false,
  qualifications_reviewed boolean NOT NULL DEFAULT false,
  safeguarding_reviewed boolean NOT NULL DEFAULT false,
  school_authorized boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),
  approved_by text,
  approved_at timestamptz,
  CHECK(status <> 'approved' OR (identity_reviewed AND qualifications_reviewed AND safeguarding_reviewed AND school_authorized AND approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS neo_education.mentor_audit (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mentor_subject text NOT NULL REFERENCES neo_education.mentor_accreditation(mentor_subject),
  action text NOT NULL,
  actor_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Restrict roles, enforce RLS and append-only audit privileges before deployment.
COMMIT;
