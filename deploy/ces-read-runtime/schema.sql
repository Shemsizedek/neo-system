CREATE TABLE IF NOT EXISTS neo_ces_source_imports (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  exchange_id text NOT NULL CHECK (exchange_id = 'NMNI'),
  observed_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  row_count integer NOT NULL CHECK (row_count BETWEEN 1 AND 250),
  payload jsonb NOT NULL
);
