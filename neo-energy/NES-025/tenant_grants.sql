-- Disposable PostgreSQL staging test. Separate from production.
BEGIN;
CREATE SCHEMA nes025;
CREATE ROLE nes025_reader_a NOLOGIN;
CREATE ROLE nes025_reader_b NOLOGIN;
CREATE TABLE nes025.site_grants (
 db_subject NAME NOT NULL,
 tenant_id TEXT NOT NULL,
 site_id TEXT NOT NULL,
 permission TEXT NOT NULL,
 revoked BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY(db_subject,tenant_id,site_id,permission)
);
CREATE TABLE nes025.energy_usage (
 site_id TEXT NOT NULL,
 tenant_id TEXT NOT NULL,
 import_kwh NUMERIC NOT NULL,
 export_kwh NUMERIC NOT NULL,
 PRIMARY KEY(tenant_id,site_id)
);
INSERT INTO nes025.site_grants VALUES
 ('nes025_reader_a','tenantA','siteA','energy.simulation.read',false),
 ('nes025_reader_b','tenantB','siteB','energy.simulation.read',false);
INSERT INTO nes025.energy_usage VALUES ('siteA','tenantA',10,2),('siteB','tenantB',20,4);
ALTER TABLE nes025.site_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes025.site_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE nes025.energy_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes025.energy_usage FORCE ROW LEVEL SECURITY;
CREATE POLICY grants_self ON nes025.site_grants FOR SELECT USING(db_subject=current_user);
CREATE POLICY usage_scoped ON nes025.energy_usage FOR SELECT USING (
 EXISTS (SELECT 1 FROM nes025.site_grants g
  WHERE g.tenant_id=energy_usage.tenant_id AND g.site_id=energy_usage.site_id
  AND g.db_subject=current_user AND g.permission='energy.simulation.read'
  AND NOT g.revoked)
);
GRANT USAGE ON SCHEMA nes025 TO nes025_reader_a,nes025_reader_b;
GRANT SELECT ON nes025.site_grants,nes025.energy_usage TO nes025_reader_a,nes025_reader_b;
COMMIT;
