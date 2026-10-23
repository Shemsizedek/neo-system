-- Disposable PostgreSQL staging fixture ONLY. Never run against production.
-- Security here is tied to PostgreSQL login roles, not to untrusted browser headers.
BEGIN;
CREATE SCHEMA nes022;
CREATE ROLE nes_customer_a NOLOGIN;
CREATE ROLE nes_customer_b NOLOGIN;
CREATE TABLE nes022.sites (site_id text PRIMARY KEY, tenant_id text NOT NULL);
CREATE TABLE nes022.grants (db_role name NOT NULL, site_id text NOT NULL REFERENCES nes022.sites(site_id), revoked boolean NOT NULL DEFAULT false, PRIMARY KEY(db_role,site_id));
CREATE TABLE nes022.readings (record_id text PRIMARY KEY,site_id text NOT NULL REFERENCES nes022.sites(site_id),import_kwh numeric NOT NULL CHECK(import_kwh>=0));
INSERT INTO nes022.sites VALUES ('siteA','tenantA'),('siteB','tenantB');
INSERT INTO nes022.grants VALUES ('nes_customer_a','siteA',false),('nes_customer_b','siteB',false);
INSERT INTO nes022.readings VALUES ('a1','siteA',10),('b1','siteB',20);
ALTER TABLE nes022.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes022.sites FORCE ROW LEVEL SECURITY;
ALTER TABLE nes022.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes022.grants FORCE ROW LEVEL SECURITY;
ALTER TABLE nes022.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nes022.readings FORCE ROW LEVEL SECURITY;
CREATE POLICY own_grants ON nes022.grants FOR SELECT USING (db_role = current_user);
CREATE POLICY site_reader ON nes022.sites FOR SELECT USING (
 EXISTS (SELECT 1 FROM nes022.grants g WHERE g.site_id=sites.site_id AND g.db_role=current_user AND NOT g.revoked)
);
CREATE POLICY reading_reader ON nes022.readings FOR SELECT USING (
 EXISTS (SELECT 1 FROM nes022.sites s WHERE s.site_id=readings.site_id)
);
GRANT USAGE ON SCHEMA nes022 TO nes_customer_a,nes_customer_b;
GRANT SELECT ON nes022.grants,nes022.sites,nes022.readings TO nes_customer_a,nes_customer_b;
COMMIT;
-- No INSERT/UPDATE/DELETE grants. These roles are CI fixtures, not NEO Pass identities.
