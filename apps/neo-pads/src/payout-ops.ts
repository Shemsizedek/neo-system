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
      count(*) FILTER (WHERE escalated_at IS NOT NULL AND status NOT IN ('SETTLED','REVERSED'))::int AS escalated
    FROM neo_pads_host_payouts
  `);
  return rows[0];
}

export async function runPayoutOps(action = process.env.NEO_PADS_OPS_ACTION ?? "reconcile") {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_required");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    if (action === "status") return { action, summary: await summary(pool) };
    if (action === "escalate") return { action, escalated: await escalateStalePayouts(pool), summary: await summary(pool) };
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
