-- Use on disposable NES-027 fixture as the administrative CI user.
\set ON_ERROR_STOP on
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM information_schema.role_table_grants
 WHERE grantee='nes027_api' AND table_schema='nes027'
 AND table_name IN ('site_grants','usage');
 IF n<>0 THEN RAISE EXCEPTION 'API role has direct table privileges'; END IF;
 SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
 WHERE ns.nspname='nes027' AND p.proname='read_usage'
 AND p.prosecdef=true;
 IF n<>1 THEN RAISE EXCEPTION 'expected one reviewed SECURITY DEFINER function'; END IF;
END $$;
SET ROLE nes027_api;
SELECT count(*) AS authorized_rows FROM nes027.read_usage('customer-a','tenantA','siteA');
SELECT count(*) AS denied_rows FROM nes027.read_usage('customer-a','tenantB','siteB');
RESET ROLE;
