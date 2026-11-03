-- NEO-OMARCHY-006 — optional dedicated staging-only enrollment challenge.
-- Requires Gate 004 and 005 SQL first. Do not run on NEO production data.
CREATE TABLE IF NOT EXISTS neo_omarchy.enrollment_challenges (
  machine_id text PRIMARY KEY
    CHECK (machine_id ~ '^neo:machine:[a-z0-9][a-z0-9-]{0,63}$'),
  nonce char(64) NOT NULL UNIQUE CHECK (nonce ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Challenge records remain after enrollment to prevent replay. Deletion,
-- retention and operational access need separate review. Runtime grants
-- must be restricted to the authenticated staging coordinator.
