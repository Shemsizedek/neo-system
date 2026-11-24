-- NEO–BAAS–003. New isolated simulation schema; no existing banking tables altered.
CREATE TABLE IF NOT EXISTS baas_sim_accounts (
 tenant_id text NOT NULL CHECK (tenant_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
 account_id text NOT NULL CHECK (account_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
 currency text NOT NULL CHECK (currency ~ '^[A-Z]{3,12}$'),
 PRIMARY KEY (tenant_id, account_id),
 UNIQUE (tenant_id, account_id, currency)
);
CREATE TABLE IF NOT EXISTS baas_sim_journals (
 id uuid PRIMARY KEY,
 tenant_id text NOT NULL,
 currency text NOT NULL,
 idempotency_key text NOT NULL,
 request_hash char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id, idempotency_key),
 UNIQUE (id, tenant_id, currency)
);
CREATE TABLE IF NOT EXISTS baas_sim_lines (
 journal_id uuid NOT NULL,
 tenant_id text NOT NULL,
 currency text NOT NULL,
 account_id text NOT NULL,
 direction text NOT NULL CHECK (direction IN ('debit', 'credit')),
 amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
 PRIMARY KEY (journal_id, direction),
 FOREIGN KEY (journal_id, tenant_id, currency)
  REFERENCES baas_sim_journals(id, tenant_id, currency) ON DELETE RESTRICT,
 FOREIGN KEY (tenant_id, account_id, currency)
  REFERENCES baas_sim_accounts(tenant_id, account_id, currency) ON DELETE RESTRICT
);
CREATE OR REPLACE FUNCTION baas_sim_enforce_balance() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE d numeric; c numeric; n integer;
BEGIN
 SELECT COALESCE(SUM(amount_minor) FILTER (WHERE direction='debit'),0),
        COALESCE(SUM(amount_minor) FILTER (WHERE direction='credit'),0), COUNT(*)
 INTO d,c,n FROM baas_sim_lines WHERE journal_id=NEW.journal_id;
 IF d <> c OR n <> 2 THEN RAISE EXCEPTION 'unbalanced_synthetic_journal' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS baas_sim_balance_check ON baas_sim_lines;
CREATE CONSTRAINT TRIGGER baas_sim_balance_check
 AFTER INSERT ON baas_sim_lines
 DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION baas_sim_enforce_balance();
-- Prevent accidental mutation of immutable journal lines by the app role via application policy.
-- DB privileges/RLS must be separately hardened before any non-test deployment.
