-- NES-026 disposable PostgreSQL experiment, NEVER production migration.
BEGIN;
CREATE SCHEMA nes026;
CREATE ROLE nes026_customer_a NOLOGIN;
CREATE ROLE nes026_customer_b NOLOGIN;
CREATE TABLE nes026.grants (
 principal NAME NOT NULL, tenant TEXT NOT NULL, site TEXT NOT NULL,
 permission TEXT NOT NULL, revoked BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY(principal,tenant,site,permission)
);
CREATE TABLE nes026.energy (
 tenant TEXT NOT NULL,site TEXT NOT NULL,import_kwh NUMERIC NOT NULL,
 export_kwh NUMERIC NOT NULL, PRIMARY KEY(tenant,site)
);
INSERT INTO nes026.grants VALUES
 ('nes026_customer_a','tenantA','siteA','energy.simulation.read',false),
 ('nes026_customer_b','tenantB','siteB','energy.simulation.read',false);
INSERT INTO nes026.energy VALUES ('tenantA','siteA',10,2),('tenantB','siteB',20,4);
ALTER TABLE nes026.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes026.grants FORCE ROW LEVEL SECURITY;
ALTER TABLE nes026.energy ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes026.energy FORCE ROW LEVEL SECURITY;
CREATE POLICY grant_self ON nes026.grants FOR SELECT USING(principal=current_user);
CREATE POLICY energy_scope ON nes026.energy FOR SELECT USING (
 EXISTS (SELECT 1 FROM nes026.grants g WHERE
 g.principal=current_user AND g.tenant=energy.tenant AND g.site=energy.site
 AND g.permission='energy.simulation.read' AND NOT g.revoked)
);
GRANT USAGE ON SCHEMA nes026 TO nes026_customer_a,nes026_customer_b;
GRANT SELECT ON nes026.energy,nes026.grants TO nes026_customer_a,nes026_customer_b;
-- SECURITY INVOKER uses the executing role's RLS, never database-owner privileges.
CREATE FUNCTION nes026.read_preview(p_tenant TEXT,p_site TEXT)
RETURNS TABLE(import_kwh NUMERIC,export_kwh NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,nes026 AS $$
 SELECT e.import_kwh,e.export_kwh FROM nes026.energy e
 WHERE e.tenant=p_tenant AND e.site=p_site
$$;
REVOKE ALL ON FUNCTION nes026.read_preview(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION nes026.read_preview(TEXT,TEXT)
 TO nes026_customer_a,nes026_customer_b;
COMMIT;
