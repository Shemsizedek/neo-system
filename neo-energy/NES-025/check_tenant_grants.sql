\set ON_ERROR_STOP on
SET ROLE nes025_reader_a;
SELECT count(*) AS a_visible FROM nes025.energy_usage;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes025.energy_usage) <> 1 THEN
  RAISE EXCEPTION 'tenant A row-level isolation failed';
 END IF;
 IF (SELECT count(*) FROM nes025.energy_usage WHERE tenant_id='tenantB') <> 0 THEN
  RAISE EXCEPTION 'tenant A cross-tenant leak';
 END IF;
END $$;
RESET ROLE;
SET ROLE nes025_reader_b;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes025.energy_usage) <> 1 THEN
  RAISE EXCEPTION 'tenant B row-level isolation failed';
 END IF;
END $$;
RESET ROLE;
UPDATE nes025.site_grants SET revoked=true WHERE db_subject='nes025_reader_a';
SET ROLE nes025_reader_a;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes025.energy_usage) <> 0 THEN
  RAISE EXCEPTION 'revoked role retained access';
 END IF;
END $$;
RESET ROLE;
