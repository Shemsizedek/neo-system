-- NEO-FLIP-005: additive, STAGING ONLY. Existing public Deal Desk tables untouched.
-- Dedicated least-privileged database role must be provisioned before any live service uses it.
BEGIN;
CREATE SCHEMA IF NOT EXISTS neo_flipper;
REVOKE ALL ON SCHEMA neo_flipper FROM PUBLIC;
CREATE TABLE IF NOT EXISTS neo_flipper.buyers(
 buyer_id text PRIMARY KEY CHECK (buyer_id ~ '^B-[A-Za-z0-9_-]{3,64}$'),
 identity_ref text NOT NULL, consent_ref text NOT NULL, consent_at timestamptz NOT NULL,
 funds_ref text NOT NULL, funds_verified_at timestamptz NOT NULL,
 max_all_in_usd numeric(14,2) NOT NULL CHECK (max_all_in_usd>0),
 markets jsonb NOT NULL CHECK (jsonb_typeof(markets)='array'),
 asset_types jsonb NOT NULL CHECK (jsonb_typeof(asset_types)='array'),
 suppressed_at timestamptz,
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flipper_active_buyers ON neo_flipper.buyers(funds_verified_at DESC) WHERE suppressed_at IS NULL;
CREATE TABLE IF NOT EXISTS neo_flipper.listings(
 listing_id text PRIMARY KEY CHECK (listing_id ~ '^[A-Za-z0-9_-]{3,100}$'),
 address text NOT NULL, market text NOT NULL, asset_type text NOT NULL,
 jurisdiction text NOT NULL CHECK (jurisdiction='US-TX'),
 source_url text NOT NULL, source_type text NOT NULL, provider_id text NOT NULL,
 source_grant_ref text NOT NULL, status_evidence_ref text NOT NULL,
 status_verified_at timestamptz NOT NULL, list_price_usd numeric(14,2) NOT NULL CHECK (list_price_usd>0),
 days_on_market integer NOT NULL CHECK (days_on_market>=120),
 listing_status text NOT NULL CHECK (listing_status IN ('active','for_sale')),
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flipper_listing_status ON neo_flipper.listings(status_verified_at DESC);
CREATE TABLE IF NOT EXISTS neo_flipper.deal_previews(
 request_key text PRIMARY KEY,
 listing_id text NOT NULL REFERENCES neo_flipper.listings(listing_id),
 buyer_matches jsonb NOT NULL CHECK (jsonb_typeof(buyer_matches)='array'),
 valuation_evidence_ref text NOT NULL, status_evidence_ref text NOT NULL,
 state text NOT NULL DEFAULT 'research_only' CHECK (state='research_only'),
 recognized_revenue_usd numeric(14,2) NOT NULL DEFAULT 0 CHECK (recognized_revenue_usd=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS neo_flipper.audit_events(
 request_key text PRIMARY KEY, payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
 actor_subject text NOT NULL,
 operation text NOT NULL CHECK (operation IN ('buyer_upsert','buyer_suppress','listing_upsert','preview_record')),
 entity_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flipper_audit_created ON neo_flipper.audit_events(created_at DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA neo_flipper FROM PUBLIC;
COMMIT;
