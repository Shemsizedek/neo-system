import { mapBankEvent, type ExternalBankEvent, type VDollarPolicy } from "./bankingBridge";

/** Staging-only deterministic CES posting planner. Never initiates funds movement. */
export interface VDollarPosting {
  key: string;
  organizationId: string;
  policyId: string;
  sourceEventId: string;
  debitAccount: string;
  creditAccount: string;
  unitsMinor: string;
  status: "awaiting-approval" | "reversal-review";
}

export class VDollarSubledger {
  private readonly postings = new Map<string, VDollarPosting>();

  propose(event: ExternalBankEvent, policy: VDollarPolicy): VDollarPosting {
    const mapped = mapBankEvent(event, policy);
    if (mapped.cesStatus !== "eligible-for-review") throw new Error("Bank event or V-Dollar policy not eligible");
    if (event.currency !== "USD") throw new Error("Non-USD conversions require a separate approved FX policy");
    const numerator = BigInt(policy.conversionNumerator);
    const denominator = BigInt(policy.conversionDenominator);
    if (numerator <= 0n || denominator <= 0n) throw new Error("Conversion ratio must be positive");
    const amount = BigInt(event.amountMinor);
    if (amount <= 0n) throw new Error("Issuance proposals require positive settled receipts");
    const product = amount * numerator;
    if (product % denominator !== 0n) throw new Error("Fractional minor-unit conversion requires rounding policy");
    const units = product / denominator;
    const prior = this.postings.get(mapped.key);
    if (prior) return { ...prior };
    const proposal: VDollarPosting = {
      key: mapped.key,
      organizationId: event.organizationId,
      policyId: policy.policyId,
      sourceEventId: event.providerEventId,
      debitAccount: policy.backingType === "reserved-funds" ? "bank-clearing" : "ces-obligation",
      creditAccount: "vdollar-liability",
      unitsMinor: units.toString(),
      status: "awaiting-approval"
    };
    this.postings.set(mapped.key, proposal);
    return { ...proposal };
  }

  flagReversal(event: ExternalBankEvent): VDollarPosting | undefined {
    if (event.status !== "returned" && event.status !== "reversed") throw new Error("Event is not a reversal");
    const key = [event.organizationId, event.provider, event.providerEventId].join(":");
    const original = this.postings.get(key);
    if (!original) return undefined;
    const updated: VDollarPosting = { ...original, status: "reversal-review" };
    this.postings.set(key, updated);
    return { ...updated };
  }

  list(): VDollarPosting[] { return [...this.postings.values()].map(x => ({ ...x })); }
}
