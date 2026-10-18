-- G004 server-side atomic posting procedure, PostgreSQL.
-- Must be run only under a restricted service role with execute permission.
CREATE OR REPLACE FUNCTION neo_treasury.post_journal(p_journal uuid, p_actor uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_state text;
  v_bad_count bigint;
BEGIN
  SELECT state INTO v_state FROM neo_treasury.journals WHERE id=p_journal FOR UPDATE;
  IF NOT FOUND OR v_state <> 'DRAFT' THEN RAISE EXCEPTION 'Journal not draft'; END IF;
  IF (SELECT count(DISTINCT actor_id) FROM neo_treasury.approvals
      WHERE object_type='JOURNAL' AND object_id=p_journal AND decision='APPROVE') < 2
  THEN RAISE EXCEPTION 'Two independent approvals required'; END IF;
  IF NOT EXISTS(SELECT 1 FROM neo_treasury.approvals
      WHERE object_type='JOURNAL' AND object_id=p_journal AND actor_id=p_actor AND decision='APPROVE')
  THEN RAISE EXCEPTION 'Actor approval missing'; END IF;
  IF EXISTS(SELECT 1 FROM neo_treasury.approvals
      WHERE object_type='JOURNAL' AND object_id=p_journal AND decision='REJECT')
  THEN RAISE EXCEPTION 'Journal rejected'; END IF;
  IF (SELECT count(*) FROM neo_treasury.journal_lines WHERE journal_id=p_journal)<2
  THEN RAISE EXCEPTION 'Journal requires two lines'; END IF;
  SELECT count(*) INTO v_bad_count FROM (
    SELECT a.currency, sum(l.debit_minor-l.credit_minor) AS net
    FROM neo_treasury.journal_lines l JOIN neo_treasury.accounts a ON a.id=l.account_id
    WHERE l.journal_id=p_journal GROUP BY a.currency
  ) balances WHERE balances.net<>0;
  IF v_bad_count>0 THEN RAISE EXCEPTION 'Unbalanced journal'; END IF;
  -- TODO before deployment: service identity/RBAC enforcement, fund balance reservation,
  -- restricted-purpose controls, append-only audit, posting idempotency and concurrency tests.
  RAISE EXCEPTION 'G004 posting disabled until authorization and funds controls certified';
END $$;
