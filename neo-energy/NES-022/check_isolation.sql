-- Run after staging_isolation.sql as PostgreSQL superuser in disposable CI DB.
\set ON_ERROR_STOP on
SET ROLE nes_customer_a;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM nes022.readings;
 IF n <> 1 THEN RAISE EXCEPTION 'A should see exactly one record; got %',n; END IF;
 SELECT count(*) INTO n FROM nes022.readings WHERE site_id='siteB';
 IF n <> 0 THEN RAISE EXCEPTION 'cross-tenant leak A->B'; END IF;
END $$;
RESET ROLE;
SET ROLE nes_customer_b;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM nes022.readings;
 IF n <> 1 THEN RAISE EXCEPTION 'B should see exactly one record; got %',n; END IF;
 SELECT count(*) INTO n FROM nes022.readings WHERE site_id='siteA';
 IF n <> 0 THEN RAISE EXCEPTION 'cross-tenant leak B->A'; END IF;
END $$;
RESET ROLE;
-- Validate a role cannot modify table data.
DO $$
BEGIN
 BEGIN
  EXECUTE 'SET ROLE nes_customer_a';
  EXECUTE 'INSERT INTO nes022.readings VALUES (''injected'',''siteA'',99)';
  RAISE EXCEPTION 'unexpected_write_permission';
 EXCEPTION WHEN insufficient_privilege THEN
  NULL;
 END;
 EXECUTE 'RESET ROLE';
END $$;
-- Revocation takes effect for subsequent queries, with application login role.
UPDATE nes022.grants SET revoked=true WHERE db_role='nes_customer_a';
SET ROLE nes_customer_a;
DO $$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM nes022.readings;
 IF n <> 0 THEN RAISE EXCEPTION 'revoked account retained records'; END IF;
END $$;
RESET ROLE;
SELECT 'NES-022 staging isolation checks completed' AS result;
