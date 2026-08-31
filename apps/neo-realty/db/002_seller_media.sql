CREATE TABLE IF NOT EXISTS neo_realty_listing_principals (
  property_id uuid NOT NULL REFERENCES neo_realty_properties(id) ON DELETE CASCADE,
  principal_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('seller','agent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, principal_id)
);

CREATE INDEX IF NOT EXISTS neo_realty_listing_principals_principal_idx
  ON neo_realty_listing_principals (principal_id, role, created_at DESC);

CREATE TABLE IF NOT EXISTS neo_realty_media_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES neo_realty_properties(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','document')),
  reference text NOT NULL,
  content_type text,
  sha256 text,
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private','authority_only')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS neo_realty_media_refs_property_idx
  ON neo_realty_media_refs (property_id, kind, visibility, sort_order, created_at);

COMMENT ON TABLE neo_realty_media_refs IS
  'References only. NEO Realty does not treat uploaded or linked documents as independent proof of title or legal authority.';
