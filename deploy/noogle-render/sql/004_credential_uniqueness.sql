-- Inactive migration: apply only to a certified database.
ALTER TABLE noogle_connect_devices ADD COLUMN IF NOT EXISTS credential_id_hash CHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS noogle_credential_globally_unique
 ON noogle_connect_devices(credential_id_hash) WHERE credential_id_hash IS NOT NULL;
-- Migration prerequisites: backfill existing records, inspect duplicates and enforce
-- NOT NULL only after a fully verified migration. Never silently drop data.
