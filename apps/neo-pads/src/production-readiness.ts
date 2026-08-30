import { Pool } from "pg";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "NEO_PADS_WEB_ORIGIN",
  "NEOPASS_API_URL",
  "NEO_COUNTER_CHECKOUT_URL",
  "NEO_PADS_CHECKOUT_RETURN_URL",
  "NEO_COUNTER_WEBHOOK_SECRET",
  "WALLET_SIGNATURE_VERIFY_URL",
  "NEO_PADS_OPS_TOKEN",
  "NEO_COUNTER_PAYOUT_STATUS_URL",
  "NEO_COUNTER_PAYOUT_API_KEY"
] as const;

const REQUIRED_TABLES = [
  "neo_pads_properties",
  "neo_pads_bookings",
  "neo_pads_wallet_verifications",
  "neo_pads_payment_events",
  "neo_pads_payments",
  "neo_pads_host_payouts",
  "neo_pads_audit_log"
] as const;

const REQUIRED_PAYOUT_COLUMNS = [
  "provider_payout_id",
  "provider_status",
  "submitted_at",
  "confirmed_at",
  "last_reconciled_at",
  "escalated_at",
  "escalation_reason",
  "acknowledged_at",
  "acknowledged_by",
  "resolution_note",
  "resolved_at",
  "resolved_by"
] as const;

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

function assertUrl(name: string, templateToken?: string) {
  const raw = process.env[name]?.trim();
  if (!raw) throw new Error(`missing_env:${name}`);
  const normalized = templateToken ? raw.replace(templateToken, "test") : raw;
  const url = new URL(normalized);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error(`https_required:${name}`);
  if (templateToken && !raw.includes(templateToken)) throw new Error(`invalid_template:${name}`);
}

async function verifySchema(pool: Pool) {
  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
    [REQUIRED_TABLES]
  );
  const foundTables = new Set(tables.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((table) => !foundTables.has(table));
  if (missingTables.length) throw new Error(`missing_tables:${missingTables.join(",")}`);

  const columns = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='neo_pads_host_payouts' AND column_name = ANY($1::text[])`,
    [REQUIRED_PAYOUT_COLUMNS]
  );
  const foundColumns = new Set(columns.rows.map((row) => row.column_name));
  const missingColumns = REQUIRED_PAYOUT_COLUMNS.filter((column) => !foundColumns.has(column));
  if (missingColumns.length) throw new Error(`missing_payout_columns:${missingColumns.join(",")}`);
}

export async function runProductionReadiness() {
  const missingEnv = REQUIRED_ENV.filter((name) => !present(name));
  if (missingEnv.length) throw new Error(`missing_env:${missingEnv.join(",")}`);

  assertUrl("NEO_PADS_WEB_ORIGIN");
  assertUrl("NEOPASS_API_URL");
  assertUrl("NEO_COUNTER_CHECKOUT_URL");
  assertUrl("NEO_PADS_CHECKOUT_RETURN_URL", "{bookingId}");
  if (present("NEO_PADS_CHECKOUT_CANCEL_URL")) assertUrl("NEO_PADS_CHECKOUT_CANCEL_URL", "{bookingId}");
  assertUrl("WALLET_SIGNATURE_VERIFY_URL");
  assertUrl("NEO_COUNTER_PAYOUT_STATUS_URL", "{payoutId}");

  const requireChain = process.env.NEO_PADS_REQUIRE_CHAIN_CONFIRMATION !== "false";
  if (requireChain) {
    if (!present("NEO_PADS_CHAIN_CONFIRMATION_URL")) throw new Error("missing_env:NEO_PADS_CHAIN_CONFIRMATION_URL");
    assertUrl("NEO_PADS_CHAIN_CONFIRMATION_URL");
  }

  const livePayoutsEnabled = process.env.NEO_PADS_PAYOUT_EXECUTION_ENABLED === "true";
  if (livePayoutsEnabled && process.env.NEO_PADS_ALLOW_READINESS_WITH_LIVE_PAYOUTS !== "true") {
    throw new Error("live_payout_execution_enabled");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("SELECT 1");
    await verifySchema(pool);
  } finally {
    await pool.end();
  }

  return {
    ready: true,
    database: "reachable",
    schema: "current",
    checkoutContract: "neo-counter-gateway-v1",
    chainConfirmationRequired: requireChain,
    payoutExecutionEnabled: livePayoutsEnabled,
    secretsPrinted: false
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionReadiness()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : "production_readiness_failed");
      process.exit(1);
    });
}
