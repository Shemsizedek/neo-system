CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS neo_realty_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type text NOT NULL CHECK (listing_type IN ('sale','rent','both')),
  property_type text NOT NULL CHECK (property_type IN ('house','condo','townhome','multifamily','apartment','land','commercial','other')),
  status text NOT NULL CHECK (status IN ('draft','pending_verification','active','under_contract','leased','sold','off_market')),
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  region text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL,
  latitude double precision,
  longitude double precision,
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing jsonb NOT NULL DEFAULT '{}'::jsonb,
  neo jsonb NOT NULL DEFAULT '{}'::jsonb,
  authority_status text NOT NULL DEFAULT 'pending' CHECK (authority_status IN ('unverified','pending','verified','rejected')),
  authority_verified_at timestamptz,
  authority_verification_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS neo_realty_properties_location_idx
  ON neo_realty_properties (country, region, city, postal_code);

CREATE INDEX IF NOT EXISTS neo_realty_properties_active_idx
  ON neo_realty_properties (status, listing_type, property_type);

CREATE INDEX IF NOT EXISTS neo_realty_properties_geo_idx
  ON neo_realty_properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS neo_realty_authority_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES neo_realty_properties(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  reference text NOT NULL,
  sha256 text,
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending','accepted','rejected')),
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS neo_realty_authority_evidence_property_idx
  ON neo_realty_authority_evidence (property_id, review_status);

COMMENT ON TABLE neo_realty_authority_evidence IS
  'Metadata/references for authority evidence only. A row does not itself prove legal title.';
