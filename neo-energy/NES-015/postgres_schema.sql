-- NES-015 prospective PostgreSQL schema. NOT deployed.
-- Production requires dedicated roles, RLS, signed meter verification, backups and migrations.
CREATE TABLE IF NOT EXISTS energy_sites (
 site_id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS energy_site_grants (
 tenant_id TEXT NOT NULL, site_id TEXT NOT NULL REFERENCES energy_sites(site_id),
 subject_id TEXT NOT NULL, permission TEXT NOT NULL,
 valid_until TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
 PRIMARY KEY(tenant_id,site_id,subject_id,permission)
);
CREATE TABLE IF NOT EXISTS energy_simulated_readings (
 record_id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES energy_sites(site_id),
 meter_id TEXT NOT NULL, start_utc TIMESTAMPTZ NOT NULL, end_utc TIMESTAMPTZ NOT NULL,
 import_kwh NUMERIC(20,6) NOT NULL CHECK(import_kwh>=0),
 export_kwh NUMERIC(20,6) NOT NULL CHECK(export_kwh>=0),
 source TEXT NOT NULL, quality TEXT NOT NULL CHECK(quality='simulated'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(end_utc>start_utc), UNIQUE(site_id,meter_id,start_utc,end_utc)
);
-- This schema is illustrative; overlapping intervals beyond identical endpoints
-- require exclusion constraints or transactional application validation.
-- Never grant direct customer table access without tenant-verified RLS.
