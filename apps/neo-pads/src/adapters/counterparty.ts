const HOMESHARES = "HOMESHARES";

export interface CounterpartyBalance {
  address: string;
  asset: string;
  quantity: number;
  source: "counterparty-core" | "neo-router";
}

function asQuantity(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
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
  const quantity = router
    ? asQuantity(body?.balance ?? body?.quantity ?? row?.quantity)
    : asQuantity(row?.quantity ?? row?.quantity_normalized ?? row?.balance);

  return {
    address,
    asset: HOMESHARES,
    quantity,
    source: router ? "neo-router" : "counterparty-core"
  };
}
