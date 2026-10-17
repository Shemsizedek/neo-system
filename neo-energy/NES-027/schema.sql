-- Disposable NES-027 end-to-end CI database. No production deployment.
BEGIN;
CREATE SCHEMA nes027;
CREATE ROLE nes027_api LOGIN PASSWORD 'ci-only-api-password';
CREATE TABLE nes027.site_grants(
 subject TEXT NOT NULL, tenant TEXT NOT NULL, site TEXT NOT NULL,
 permission TEXT NOT NULL, revoked BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY(subject,tenant,site,permission));
CREATE TABLE nes027.usage(
 tenant TEXT NOT NULL,site TEXT NOT NULL,import_kwh NUMERIC NOT NULL,
 export_kwh NUMERIC NOT NULL,PRIMARY KEY(tenant,site));
INSERT INTO nes027.site_grants VALUES
 ('customer-a','tenantA','siteA','energy.simulation.read',false),
 ('customer-b','tenantB','siteB','energy.simulation.read',false);
INSERT INTO nes027.usage VALUES
 ('tenantA','siteA',10,2),('tenantB','siteB',20,4);
REVOKE ALL ON SCHEMA nes027 FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA nes027 FROM PUBLIC;
-- API role gets no direct table access, only one narrowly scoped read function.
CREATE FUNCTION nes027.read_usage(p_subject TEXT,p_tenant TEXT,p_site TEXT)
RETURNS TABLE(import_kwh NUMERIC,export_kwh NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT u.import_kwh,u.export_kwh FROM nes027.usage AS u
 WHERE u.tenant=p_tenant AND u.site=p_site AND EXISTS(
   SELECT 1 FROM nes027.site_grants AS g
   WHERE g.subject=p_subject AND g.tenant=u.tenant AND g.site=u.site
   AND g.permission='energy.simulation.read' AND NOT g.revoked
 )
$$;
REVOKE ALL ON FUNCTION nes027.read_usage(TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT USAGE ON SCHEMA nes027 TO nes027_api;
GRANT EXECUTE ON FUNCTION nes027.read_usage(TEXT,TEXT,TEXT) TO nes027_api;
COMMIT;
