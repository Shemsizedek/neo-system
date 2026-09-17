import type { MoneyCurrency } from "./types";

export interface AssetValuation {
  asset: string;
  quantity: number;
  unitPrice: number;
  quoteCurrency: MoneyCurrency;
  valuedAt: string;
  source: string;
  method: "market" | "last-trade" | "manual-reference" | "cost";
  liquidityNote?: string;
}

export function functionalValue(valuation: AssetValuation): number {
  if (!Number.isFinite(valuation.quantity) || !Number.isFinite(valuation.unitPrice)) {
    throw new Error("Valuation quantity and unit price must be finite numbers.");
  }
  return Math.round(valuation.quantity * valuation.unitPrice * 1e8) / 1e8;
}

export function requiresValuationReview(valuation: AssetValuation): boolean {
  return valuation.method === "manual-reference" || Boolean(valuation.liquidityNote);
}
