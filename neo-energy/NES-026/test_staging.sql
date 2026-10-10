\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE nes026_customer_a;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes026.read_preview('tenantA','siteA'))<>1
 THEN RAISE EXCEPTION 'A cannot access own data'; END IF;
 IF (SELECT count(*) FROM nes026.read_preview('tenantB','siteB'))<>0
 THEN RAISE EXCEPTION 'tenant boundary breached'; END IF;
 IF (SELECT count(*) FROM nes026.read_preview('tenantA','siteB'))<>0
 THEN RAISE EXCEPTION 'site boundary breached'; END IF;
END $$;
COMMIT;
BEGIN;
SET LOCAL ROLE nes026_customer_b;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes026.read_preview('tenantB','siteB'))<>1
 THEN RAISE EXCEPTION 'B cannot access own data'; END IF;
 IF (SELECT count(*) FROM nes026.read_preview('tenantA','siteA'))<>0
 THEN RAISE EXCEPTION 'B accessed A'; END IF;
END $$;
COMMIT;
-- Privilege context must reset between transactions.
SELECT CASE WHEN current_user='postgres' THEN 'RESET_OK'
 ELSE 'RESET_FAILED' END AS tx_role_reset;
UPDATE nes026.grants SET revoked=true WHERE principal='nes026_customer_a';
BEGIN;
SET LOCAL ROLE nes026_customer_a;
DO $$
BEGIN
 IF (SELECT count(*) FROM nes026.read_preview('tenantA','siteA'))<>0
 THEN RAISE EXCEPTION 'revoked grant still authorized'; END IF;
END $$;
COMMIT;
