-- NEO Relations baseline schema
-- PostgreSQL-oriented foundation; migrations should own production evolution.

create table if not exists relations_tenants (
  id text primary key,
  display_name text not null,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists relations_entities (
  id uuid primary key,
  entity_type text not null check (entity_type in ('person','organization','household','service_account')),
  canonical_name text not null,
  external_refs jsonb not null default '{}'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists relations_people (
  entity_id uuid primary key references relations_entities(id) on delete cascade,
  given_name text,
  middle_name text,
  family_name text,
  preferred_name text,
  email text,
  phone text
);

create table if not exists relations_organizations (
  entity_id uuid primary key references relations_entities(id) on delete cascade,
  legal_name text,
  organization_type text,
  website text
);

create table if not exists relations_relationships (
  id uuid primary key,
  tenant_id text not null references relations_tenants(id),
  subject_entity_id uuid not null references relations_entities(id),
  object_entity_id uuid references relations_entities(id),
  service_key text not null,
  relationship_type text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists relations_records (
  id uuid primary key,
  tenant_id text not null references relations_tenants(id),
  entity_id uuid references relations_entities(id),
  record_type text not null check (record_type in ('lead','opportunity','case','task','interaction','note','document','agreement','subscription','account')),
  title text not null,
  status text not null default 'open',
  owner_ref text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists relations_pipeline_stages (
  id uuid primary key,
  tenant_id text not null references relations_tenants(id),
  pipeline_key text not null,
  stage_key text not null,
  label text not null,
  ordinal integer not null,
  config jsonb not null default '{}'::jsonb,
  unique (tenant_id, pipeline_key, stage_key)
);

create table if not exists relations_audit_events (
  id uuid primary key,
  tenant_id text references relations_tenants(id),
  actor_ref text,
  action text not null,
  resource_type text not null,
  resource_id text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_rel_entities_name on relations_entities (canonical_name);
create index if not exists idx_rel_relationships_subject on relations_relationships (subject_entity_id);
create index if not exists idx_rel_relationships_tenant_service on relations_relationships (tenant_id, service_key);
create index if not exists idx_rel_records_tenant_type on relations_records (tenant_id, record_type);
create index if not exists idx_rel_records_entity on relations_records (entity_id);