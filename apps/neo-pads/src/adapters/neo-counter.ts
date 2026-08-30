export interface CheckoutRequest {
  bookingId: string;
  amountWorld: number;
  payoutWallet: string;
  settlementAsset?: "BTC" | "XCP" | "NOMNI";
}

export interface CheckoutResponse {
  checkoutId: string;
  status: "REDIRECT_REQUIRED";
  checkoutUrl: string;
  settlementAsset: "BTC" | "XCP" | "NOMNI";
  commercialPrice: {
    amount: number;
    currency: "WORLD_CURRENCY";
    symbol: "∞";
  };
}

function requireGatewayUrl() {
  const raw = process.env.NEO_COUNTER_CHECKOUT_URL?.trim();
  if (!raw) throw new Error("neo_counter_checkout_url_not_configured");
  const url = new URL(raw);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("neo_counter_checkout_url_requires_https");
  }
  return url;
}

function returnUrl(template: string | undefined, bookingId: string) {
  if (!template?.trim()) return undefined;
  const rendered = template.replaceAll("{bookingId}", encodeURIComponent(bookingId));
  const url = new URL(rendered);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("neo_pads_checkout_return_url_requires_https");
  }
  return url.toString();
}

export async function createCheckout(input: CheckoutRequest): Promise<CheckoutResponse> {
  if (!Number.isFinite(input.amountWorld) || input.amountWorld <= 0) {
    throw new Error("neo_counter_checkout_amount_invalid");
  }
  const settlementAsset = input.settlementAsset;
  if (!settlementAsset || !["BTC", "XCP", "NOMNI"].includes(settlementAsset)) {
    throw new Error("neo_counter_checkout_settlement_asset_invalid");
  }

  const url = requireGatewayUrl();
  const amountMinor = Math.round(input.amountWorld * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || amountMinor > 100_000_000) {
    throw new Error("neo_counter_checkout_amount_out_of_range");
  }

  url.searchParams.set("checkout", "1");
  url.searchParams.set("service", "NEO Pads");
  url.searchParams.set("order", input.bookingId);
  url.searchParams.set("label", `NEO Pads · ${input.bookingId}`);
  url.searchParams.set("amount", String(amountMinor));
  url.searchParams.set("currency", "WORLD_CURRENCY");
  url.searchParams.set("rail", settlementAsset);

  const successUrl = returnUrl(process.env.NEO_PADS_CHECKOUT_RETURN_URL, input.bookingId);
  const cancelUrl = returnUrl(process.env.NEO_PADS_CHECKOUT_CANCEL_URL ?? process.env.NEO_PADS_CHECKOUT_RETURN_URL, input.bookingId);
  if (successUrl) url.searchParams.set("success_url", successUrl);
  if (cancelUrl) url.searchParams.set("cancel_url", cancelUrl);

  return {
    checkoutId: input.bookingId,
    status: "REDIRECT_REQUIRED",
    checkoutUrl: url.toString(),
    settlementAsset,
    commercialPrice: {
      amount: input.amountWorld,
      currency: "WORLD_CURRENCY",
      symbol: "∞"
    }
  };
}
