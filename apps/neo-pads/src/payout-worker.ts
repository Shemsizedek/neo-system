import crypto from "node:crypto";
import { Pool } from "pg";

export interface PayoutCandidate {
  bookingId: string;
  hostWallet: string;
  settlementAsset: "BTC" | "XCP" | "NOMNI";
  amount: number;
}

export async function materializePayouts(pool: Pool): Promise<number> {
  const { rows } = await pool.query(`
    SELECT b.id AS booking_id,
           p.host_wallet,
           pay.settlement_asset,
           COALESCE(pay.network_amount - COALESCE(pay.network_fee,0), 0) AS payout_amount
      FROM neo_pads_bookings b
      JOIN neo_pads_properties p ON p.id=b.property_id
      JOIN LATERAL (
        SELECT * FROM neo_pads_payments np
         WHERE np.booking_id=b.id AND np.status='SETTLED'
         ORDER BY np.settled_at DESC NULLS LAST, np.created_at DESC
         LIMIT 1
      ) pay ON true
 LEFT JOIN neo_pads_host_payouts hp ON hp.booking_id=b.id
     WHERE b.state='CONFIRMED'
       AND hp.id IS NULL
       AND pay.settlement_asset IN ('BTC','XCP','NOMNI')
       AND COALESCE(pay.network_amount - COALESCE(pay.network_fee,0),0) > 0
     FOR UPDATE OF b SKIP LOCKED
     LIMIT 100
  `);

  let created = 0;
  for (const row of rows) {
    const payoutId = `NPP-${crypto.randomUUID()}`;
    const result = await pool.query(
      `INSERT INTO neo_pads_host_payouts(id,booking_id,host_wallet,settlement_asset,amount,status)
       VALUES($1,$2,$3,$4,$5,'PENDING')
       ON CONFLICT(booking_id) DO NOTHING`,
      [payoutId, row.booking_id, row.host_wallet, row.settlement_asset, row.payout_amount]
    );
    created += result.rowCount ?? 0;
  }
  return created;
}

export async function submitPendingPayouts(pool: Pool): Promise<{ submitted: number; failed: number }> {
  if (process.env.NEO_PADS_PAYOUT_EXECUTION_ENABLED !== "true") {
    return { submitted: 0, failed: 0 };
  }

  const base = process.env.NEO_COUNTER_API_URL;
  const token = process.env.NEO_COUNTER_PAYOUT_API_KEY;
  if (!base || !token) throw new Error("payout_execution_not_configured");

  const { rows } = await pool.query(`
    SELECT id, booking_id, host_wallet, settlement_asset, amount
      FROM neo_pads_host_payouts
     WHERE status IN ('PENDING','FAILED')
     ORDER BY created_at
     LIMIT 50
     FOR UPDATE SKIP LOCKED
  `);

  let submitted = 0;
  let failed = 0;
  for (const payout of rows) {
    try {
      await pool.query(
        `UPDATE neo_pads_host_payouts
            SET status='AUTHORIZED', attempt_count=attempt_count+1, last_error=NULL
          WHERE id=$1`,
        [payout.id]
      );

      const response = await fetch(new URL("/payouts", base), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "idempotency-key": payout.id
        },
        body: JSON.stringify({
          payoutId: payout.id,
          bookingId: payout.booking_id,
          wallet: payout.host_wallet,
          settlementAsset: payout.settlement_asset,
          amount: Number(payout.amount)
        })
      });
      if (!response.ok) throw new Error(`neo_counter_payout_failed:${response.status}`);
      const body = await response.json() as any;
      const providerPayoutId = body?.payoutId ?? body?.id ?? payout.id;
      const providerStatus = String(body?.status ?? body?.state ?? "SUBMITTED").toUpperCase();
      await pool.query(
        `UPDATE neo_pads_host_payouts
            SET status='SUBMITTED', provider_payout_id=$2, provider_status=$3,
                txid=COALESCE($4,txid), submitted_at=COALESCE(submitted_at,now()), last_error=NULL
          WHERE id=$1`,
        [payout.id, providerPayoutId, providerStatus, body?.txid ?? null]
      );
      submitted++;
    } catch (error) {
      await pool.query(
        `UPDATE neo_pads_host_payouts
            SET status='FAILED', last_error=$2
          WHERE id=$1`,
        [payout.id, error instanceof Error ? error.message.slice(0,500) : "payout_failed"]
      );
      failed++;
    }
  }
  return { submitted, failed };
}

export async function runPayoutWorker() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_required");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const materialized = await materializePayouts(pool);
    const submission = await submitPendingPayouts(pool);
    return { materialized, ...submission };
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPayoutWorker()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
