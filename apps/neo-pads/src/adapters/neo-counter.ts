export interface CheckoutRequest {
  bookingId: string;
  amountWorld: number;
  payoutWallet: string;
  settlementAsset?: "BTC" | "XCP" | "NOMNI";
}

export async function createCheckout(input: CheckoutRequest) {
  const base = process.env.NEO_COUNTER_API_URL;
  if (!base) throw new Error("neo_counter_adapter_not_configured");

  const response = await fetch(new URL("/checkout", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
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
  return response.json();
}
