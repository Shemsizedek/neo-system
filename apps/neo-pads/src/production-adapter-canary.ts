import { getHomesharesBalance } from "./adapters/counterparty.js";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_required`);
  return value;
}

async function probeNeoCounter() {
  const url = requireEnv("NEO_COUNTER_HEALTH_URL");
  const headers: Record<string, string> = { accept: "application/json" };
  const key = process.env.NEO_COUNTER_API_KEY?.trim();
  if (key) headers.authorization = `Bearer ${key}`;

  const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`neo_counter_canary_failed:${response.status}`);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("neo_counter_canary_non_json");
  const body = await response.json() as any;
  if (body?.status && !["ok", "ready", "healthy"].includes(String(body.status).toLowerCase())) {
    throw new Error(`neo_counter_canary_unhealthy:${String(body.status)}`);
  }
  return { ok: true, status: response.status };
}

async function main() {
  if (process.env.NEO_PADS_PAYOUT_EXECUTION_ENABLED === "true") {
    throw new Error("canary_refuses_live_payout_execution_enabled");
  }

  const canaryWallet = requireEnv("NEO_PADS_COUNTERPARTY_CANARY_WALLET");
  const counterparty = await getHomesharesBalance(canaryWallet);
  if (counterparty.asset !== "HOMESHARES") throw new Error("counterparty_canary_wrong_asset");
  if (!Number.isFinite(counterparty.quantity) || counterparty.quantity < 0) {
    throw new Error("counterparty_canary_invalid_quantity");
  }

  const neoCounter = await probeNeoCounter();

  console.log(JSON.stringify({
    service: "NEO_PADS",
    canary: "production_adapters",
    status: "ready",
    counterparty: {
      source: counterparty.source,
      asset: counterparty.asset,
      quantityObserved: true
    },
    neoCounter
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    service: "NEO_PADS",
    canary: "production_adapters",
    status: "failed",
    reason: error instanceof Error ? error.message : "unknown_error"
  }));
  process.exit(1);
});
