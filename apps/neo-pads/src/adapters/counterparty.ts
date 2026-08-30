const HOMESHARES = "HOMESHARES";

export interface CounterpartyBalance {
  address: string;
  asset: string;
  quantity: number;
  source: "counterparty-core" | "neo-router";
  counterpartyHeight?: number;
  bitcoinHeight?: number;
  ready?: boolean;
  ledgerState?: string;
}

function asFiniteNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNormalizedQuantity(row: any): number {
  const normalized = asFiniteNumber(row?.quantity_normalized);
  if (normalized !== undefined) return normalized;
  const fallback = asFiniteNumber(row?.quantity);
  if (fallback !== undefined) return fallback;
  throw new Error("counterparty_balance_quantity_missing");
}

export async function getHomesharesBalance(address: string): Promise<CounterpartyBalance> {
  const router = process.env.COUNTERPARTY_BALANCE_URL;
  const core = process.env.COUNTERPARTY_CORE_URL;
  const base = router || core;
  if (!base) throw new Error("counterparty_adapter_not_configured");

  const url = router
    ? new URL(router)
    : new URL(`/v2/addresses/${encodeURIComponent(address)}/balances`, base);

  if (router) url.searchParams.set("address", address);
  url.searchParams.set("asset", HOMESHARES);

  const response = await fetch(url, {
    headers: process.env.COUNTERPARTY_API_KEY
      ? { Authorization: `Bearer ${process.env.COUNTERPARTY_API_KEY}` }
      : undefined
  });
  if (!response.ok) throw new Error(`counterparty_balance_lookup_failed:${response.status}`);

  const body = await response.json() as any;
  const rows = Array.isArray(body?.result) ? body.result : Array.isArray(body) ? body : [];
  const row = rows.find((item: any) => item?.asset === HOMESHARES);

  let quantity: number;
  if (router) {
    const parsed = asFiniteNumber(body?.balance ?? body?.quantity ?? row?.quantity_normalized ?? row?.quantity);
    if (parsed === undefined) throw new Error("counterparty_balance_quantity_missing");
    quantity = parsed;
  } else {
    if (!Array.isArray(body?.result)) throw new Error("counterparty_core_contract_invalid");
    quantity = row ? parseNormalizedQuantity(row) : 0;
  }

  const counterpartyHeight = asFiniteNumber(response.headers.get("x-counterparty-height"));
  const bitcoinHeight = asFiniteNumber(response.headers.get("x-bitcoin-height"));
  const readyHeader = response.headers.get("x-counterparty-ready");
  const ready = readyHeader == null ? undefined : readyHeader.toLowerCase() === "true";
  const ledgerState = response.headers.get("x-ledger-state") ?? undefined;

  if (!router && ready === false) throw new Error("counterparty_core_not_ready");

  return {
    address,
    asset: HOMESHARES,
    quantity,
    source: router ? "neo-router" : "counterparty-core",
    counterpartyHeight,
    bitcoinHeight,
    ready,
    ledgerState
  };
}
