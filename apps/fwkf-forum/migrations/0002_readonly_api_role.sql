-- Gate 023 (STAGING ONLY): constrain the FWKF Forum HTTP reader.
-- The API must SET LOCAL ROLE within BEGIN READ ONLY on every database request.
-- NOLOGIN role: never publish privileged owner credentials to the browser.
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='fwkf_forum_reader') THEN
  CREATE ROLE fwkf_forum_reader NOLOGIN;
 END IF;
END $$;
GRANT USAGE ON SCHEMA fwkf_forum TO fwkf_forum_reader;
GRANT SELECT (slug,name,description,status,visibility) ON fwkf_forum.communities TO fwkf_forum_reader;
GRANT SELECT (auth_subject,role,status) ON fwkf_forum.members TO fwkf_forum_reader;
GRANT fwkf_forum_reader TO neondb_owner;
