export function formatGatewayDisplay(amountMinor: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) return "—";

  const major = amountMinor / 100;
  if (normalizedCurrency === "WORLD_CURRENCY") {
    const value = major.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
    return `∞${value}`;
  }

  if (normalizedCurrency === "USD") return `$${major.toFixed(2)}`;
  return `${major.toFixed(2)} ${normalizedCurrency || "UNKNOWN"}`;
}

export function gatewayRails(currency: string): readonly ("BTC" | "XCP" | "NOMNI" | "USD")[] {
  return currency.trim().toUpperCase() === "WORLD_CURRENCY"
    ? ["BTC", "XCP", "NOMNI"]
    : ["BTC", "XCP", "NOMNI", "USD"];
}
