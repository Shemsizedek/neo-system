-- Prototype PostgreSQL row-level security policy. NOT applied to production.
-- Requires validated principal and tenant claims set with SET LOCAL in
-- an authenticated request transaction after the server verifies session.
-- A production review must consider role ownership, FORCE RLS, bypass roles,
-- SECURITY DEFINER functions, pooler context reset and policy tests.
ALTER TABLE energy_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_sites FORCE ROW LEVEL SECURITY;
ALTER TABLE energy_site_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_site_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE energy_simulated_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_simulated_readings FORCE ROW LEVEL SECURITY;

-- Read-policy example: only authorized site grant for verified context.
CREATE POLICY energy_site_read ON energy_sites FOR SELECT USING (
  tenant_id = NULLIF(current_setting('neo.tenant_id',true),'')
  AND EXISTS (
    SELECT 1 FROM energy_site_grants g
    WHERE g.site_id = energy_sites.site_id AND g.tenant_id=energy_sites.tenant_id
      AND g.subject_id = NULLIF(current_setting('neo.subject_id',true),'')
      AND g.permission = 'energy.simulation.read'
      AND g.revoked_at IS NULL
      AND (g.valid_until IS NULL OR g.valid_until > now())
  )
);
-- Reading visibility is mediated through sites.
CREATE POLICY energy_sim_read ON energy_simulated_readings FOR SELECT USING (
  EXISTS (SELECT 1 FROM energy_sites s WHERE s.site_id=energy_simulated_readings.site_id)
);
-- No direct customer SELECT policy for grants: grant lookup is by a separately
-- audited trusted authorization service. Do not grant DML privileges to portal roles.
-- These policies need migration transaction and integration/penetration tests before use.
