export interface CheckoutRequest {
  bookingId: string;
  amountWorld: number;
  payoutWallet: string;
  settlementAsset?: "BTC" | "XCP" | "NOMNI";
}

export interface CheckoutResponse {
  checkoutId: string;
  status?: string;
  settlementAsset?: string;
  [key: string]: unknown;
}

function assertCheckoutResponse(value: unknown): CheckoutResponse {
  if (!value || typeof value !== "object") throw new Error("neo_counter_checkout_contract_invalid");
  const checkoutId = String((value as any).checkoutId ?? (value as any).id ?? "").trim();
  if (!checkoutId) throw new Error("neo_counter_checkout_contract_invalid");
  return { ...(value as Record<string, unknown>), checkoutId } as CheckoutResponse;
}

export async function createCheckout(input: CheckoutRequest): Promise<CheckoutResponse> {
  const base = process.env.NEO_COUNTER_API_URL;
  if (!base) throw new Error("neo_counter_adapter_not_configured");

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.NEO_COUNTER_API_KEY) headers.authorization = `Bearer ${process.env.NEO_COUNTER_API_KEY}`;

  const response = await fetch(new URL("/checkout", base), {
    method: "POST",
    headers,
    body: JSON.stringify({
      bookingId: input.bookingId,
      commercialPrice: {
        amount: input.amountWorld,
        currency: "WORLD_CURRENCY",
        symbol: "∞"
      },
      payoutWallet: input.payoutWallet,
      settlementAsset: input.settlementAsset
    })
  });

  if (!response.ok) throw new Error(`neo_counter_checkout_failed:${response.status}`);
  return assertCheckoutResponse(await response.json());
}
