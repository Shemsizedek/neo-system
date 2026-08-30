import { Pool } from "pg";
import { reconcileSubmittedPayouts } from "./payout-reconciler.js";

async function escalateStalePayouts(pool: Pool) {
  const staleMinutes = Math.max(15, Number(process.env.NEO_PADS_PAYOUT_STALE_MINUTES ?? 120));
  const { rows } = await pool.query(
    `UPDATE neo_pads_host_payouts
        SET escalated_at=COALESCE(escalated_at,now()),
            escalation_reason=COALESCE(escalation_reason,'stale_payout')
      WHERE status IN ('AUTHORIZED','SUBMITTED','FAILED')
        AND COALESCE(last_reconciled_at,updated_at,created_at) < now() - ($1::text || ' minutes')::interval
        AND escalated_at IS NULL
      RETURNING id,status,booking_id`,
    [staleMinutes]
  );
  for (const payout of rows) {
    await pool.query(
      `INSERT INTO neo_pads_audit_log(aggregate_type,aggregate_id,event_type,actor_type,actor_id,next_state)
       VALUES('HOST_PAYOUT',$1,'PAYOUT_ESCALATED','PAYOUT_OPS','neo-pads',$2::jsonb)`,
      [payout.id, JSON.stringify({ status: payout.status, reason: "stale_payout", staleMinutes })]
    );
  }
  return rows.length;
}

async function summary(pool: Pool) {
  const { rows } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE status='PENDING')::int AS pending,
      count(*) FILTER (WHERE status='AUTHORIZED')::int AS authorized,
      count(*) FILTER (WHERE status='SUBMITTED')::int AS submitted,
      count(*) FILTER (WHERE status='SETTLED')::int AS settled,
      count(*) FILTER (WHERE status='FAILED')::int AS failed,
      count(*) FILTER (WHERE status='REVERSED')::int AS reversed,
      count(*) FILTER (WHERE escalated_at IS NOT NULL AND resolved_at IS NULL)::int AS unresolved_escalations
    FROM neo_pads_host_payouts
  `);
  return rows[0];
}

async function acknowledge(pool: Pool, payoutId: string, operator: string, note: string) {
  const { rows } = await pool.query(
    `UPDATE neo_pads_host_payouts
        SET acknowledged_at=COALESCE(acknowledged_at,now()),
            acknowledged_by=COALESCE(acknowledged_by,$2),
            operator_note=CASE WHEN $3='' THEN operator_note ELSE $3 END
      WHERE id=$1 AND escalated_at IS NOT NULL
      RETURNING id,status,booking_id,acknowledged_at,acknowledged_by`,
    [payoutId, operator, note]
  );
  if (!rows[0]) throw new Error("payout_not_escalated_or_not_found");
  await pool.query(
    `INSERT INTO neo_pads_audit_log(aggregate_type,aggregate_id,event_type,actor_type,actor_id,next_state)
     VALUES('HOST_PAYOUT',$1,'PAYOUT_ESCALATION_ACKNOWLEDGED','OPERATOR',$2,$3::jsonb)`,
    [payoutId, operator, JSON.stringify({ acknowledged: true, note: note || undefined })]
  );
  return rows[0];
}

async function resolve(pool: Pool, payoutId: string, operator: string, note: string) {
  if (!note.trim()) throw new Error("resolution_note_required");
  const { rows } = await pool.query(
    `UPDATE neo_pads_host_payouts
        SET resolved_at=now(), resolved_by=$2, resolution_note=$3
      WHERE id=$1 AND escalated_at IS NOT NULL AND resolved_at IS NULL
      RETURNING id,status,booking_id,resolved_at,resolved_by`,
    [payoutId, operator, note]
  );
  if (!rows[0]) throw new Error("payout_not_escalated_or_already_resolved");
  await pool.query(
    `INSERT INTO neo_pads_audit_log(aggregate_type,aggregate_id,event_type,actor_type,actor_id,next_state)
     VALUES('HOST_PAYOUT',$1,'PAYOUT_ESCALATION_RESOLVED','OPERATOR',$2,$3::jsonb)`,
    [payoutId, operator, JSON.stringify({ resolved: true, note })]
  );
  return rows[0];
}

export async function runPayoutOps(action = process.env.NEO_PADS_OPS_ACTION ?? "reconcile") {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_required");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    if (action === "status") return { action, summary: await summary(pool) };
    if (action === "escalate") return { action, escalated: await escalateStalePayouts(pool), summary: await summary(pool) };
    if (action === "acknowledge" || action === "resolve") {
      const payoutId = process.env.NEO_PADS_OPS_PAYOUT_ID ?? process.argv[3];
      const operator = process.env.NEO_PADS_OPS_OPERATOR ?? process.argv[4] ?? "operator";
      const note = process.env.NEO_PADS_OPS_NOTE ?? process.argv[5] ?? "";
      if (!payoutId) throw new Error("payout_id_required");
      const result = action === "acknowledge" ? await acknowledge(pool, payoutId, operator, note) : await resolve(pool, payoutId, operator, note);
      return { action, result, summary: await summary(pool) };
    }
    if (action !== "reconcile") throw new Error("unsupported_ops_action");
    const reconciliation = await reconcileSubmittedPayouts(pool);
    const escalated = await escalateStalePayouts(pool);
    return { action, reconciliation, escalated, summary: await summary(pool) };
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPayoutOps(process.argv[2]).then((result) => console.log(JSON.stringify(result))).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
