import { Pool } from "pg";

type ProviderPayoutStatus = "PENDING" | "PROCESSING" | "SUBMITTED" | "SETTLED" | "FAILED" | "REVERSED" | "UNKNOWN";

function normalizeStatus(value: unknown): ProviderPayoutStatus {
  const status = String(value ?? "").toUpperCase();
  if (["PENDING", "PROCESSING", "SUBMITTED", "SETTLED", "FAILED", "REVERSED"].includes(status)) {
    return status as ProviderPayoutStatus;
  }
  if (status === "CONFIRMED" || status === "COMPLETED") return "SETTLED";
  if (status === "REJECTED") return "FAILED";
  if (status === "REFUNDED") return "REVERSED";
  return "UNKNOWN";
}

async function chainConfirmed(txid: string, asset: string): Promise<boolean> {
  const requireChainConfirmation = process.env.NEO_PADS_REQUIRE_CHAIN_CONFIRMATION !== "false";
  if (!requireChainConfirmation) return true;

  const verifier = process.env.NEO_PADS_CHAIN_CONFIRMATION_URL;
  if (!verifier) return false;
  const url = new URL(verifier);
  url.searchParams.set("txid", txid);
  url.searchParams.set("asset", asset);
  const response = await fetch(url, {
    headers: process.env.NEO_PADS_CHAIN_CONFIRMATION_API_KEY
      ? { authorization: `Bearer ${process.env.NEO_PADS_CHAIN_CONFIRMATION_API_KEY}` }
      : undefined
  });
  if (!response.ok) return false;
  const body = await response.json() as any;
  return body?.confirmed === true || body?.settled === true;
}

export async function reconcileSubmittedPayouts(pool: Pool): Promise<{ checked: number; settled: number; failed: number; reversed: number }> {
  const statusUrlTemplate = process.env.NEO_COUNTER_PAYOUT_STATUS_URL;
  const token = process.env.NEO_COUNTER_PAYOUT_API_KEY;
  if (!statusUrlTemplate || !token) throw new Error("payout_status_reconciliation_not_configured");

  const { rows } = await pool.query(`
    SELECT id, provider_payout_id, booking_id, settlement_asset, txid, status
      FROM neo_pads_host_payouts
     WHERE status IN ('AUTHORIZED','SUBMITTED')
     ORDER BY COALESCE(last_reconciled_at, created_at)
     LIMIT 100
     FOR UPDATE SKIP LOCKED
  `);

  let settled = 0;
  let failed = 0;
  let reversed = 0;

  for (const payout of rows) {
    const providerId = payout.provider_payout_id || payout.id;
    const url = new URL(statusUrlTemplate.replace("{payoutId}", encodeURIComponent(providerId)));
    try {
      const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`neo_counter_payout_status_failed:${response.status}`);
      const body = await response.json() as any;
      const providerStatus = normalizeStatus(body?.status ?? body?.state);
      const txid = body?.txid ?? payout.txid ?? null;

      if (providerStatus === "SETTLED") {
        if (!txid || !(await chainConfirmed(String(txid), String(payout.settlement_asset)))) {
          await pool.query(
            `UPDATE neo_pads_host_payouts
                SET provider_status=$2, txid=COALESCE($3,txid), last_reconciled_at=now(), last_error='chain_confirmation_pending'
              WHERE id=$1`,
            [payout.id, providerStatus, txid]
          );
          continue;
        }
        await pool.query(
          `UPDATE neo_pads_host_payouts
              SET status='SETTLED', provider_status=$2, txid=$3, settled_at=now(), confirmed_at=now(), last_reconciled_at=now(), last_error=NULL
            WHERE id=$1`,
          [payout.id, providerStatus, txid]
        );
        settled++;
      } else if (providerStatus === "FAILED") {
        await pool.query(
          `UPDATE neo_pads_host_payouts
              SET status='FAILED', provider_status=$2, last_reconciled_at=now(), last_error=COALESCE($3,'provider_failed')
            WHERE id=$1`,
          [payout.id, providerStatus, body?.error ?? null]
        );
        failed++;
      } else if (providerStatus === "REVERSED") {
        await pool.query(
          `UPDATE neo_pads_host_payouts
              SET status='REVERSED', provider_status=$2, txid=COALESCE($3,txid), last_reconciled_at=now(), last_error=NULL
            WHERE id=$1`,
          [payout.id, providerStatus, txid]
        );
        reversed++;
      } else {
        await pool.query(
          `UPDATE neo_pads_host_payouts
              SET provider_status=$2, txid=COALESCE($3,txid), last_reconciled_at=now(), last_error=NULL
            WHERE id=$1`,
          [payout.id, providerStatus, txid]
        );
      }
    } catch (error) {
      await pool.query(
        `UPDATE neo_pads_host_payouts
            SET last_reconciled_at=now(), last_error=$2
          WHERE id=$1`,
        [payout.id, error instanceof Error ? error.message.slice(0,500) : "payout_reconciliation_failed"]
      );
    }
  }

  return { checked: rows.length, settled, failed, reversed };
}

export async function runPayoutReconciler() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_required");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    return await reconcileSubmittedPayouts(pool);
  } finally {
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPayoutReconciler()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
