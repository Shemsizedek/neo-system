/**
 * NEO Bank / CES external banking ingestion contract.
 * V-Dollars are internally defined ledger units, not automatically USD deposits,
 * bank money, legal tender, or externally redeemable claims.
 * This adapter does not initiate transfers or issue credits.
 */
export type BankingRail = "ach" | "wire" | "fedwire" | "rtp" | "fednow" | "card" | "open-banking" | "manual";
export type BankEventStatus = "pending" | "posted" | "returned" | "reversed";

export interface ExternalBankEvent {
  provider: string;
  providerEventId: string;
  bankAccountReference: string; // opaque token; never store credentials or full account numbers
  organizationId: string;
  rail: BankingRail;
  status: BankEventStatus;
  currency: string;
  amountMinor: string; // integer decimal string, avoids floating-point money
  occurredAt: string;
  evidenceReference: string;
}

export interface VDollarPolicy {
  policyId: string;
  organizationId: string;
  unit: "VDOLLAR";
  conversionNumerator: string;
  conversionDenominator: string;
  backingType: "mutual-credit" | "reserved-funds" | "contractual-obligation";
  approved: boolean;
  effectiveAt: string;
}

export interface BankToCesRecord {
  key: string;
  organizationId: string;
  bankStatus: BankEventStatus;
  accountingStatus: "pending" | "ready-for-review" | "reversal-review";
  cesStatus: "not-authorized" | "eligible-for-review";
  sourceAmountMinor: string;
  sourceCurrency: string;
  policyId?: string;
  evidenceReference: string;
}

export function mapBankEvent(event: ExternalBankEvent, policy?: VDollarPolicy): BankToCesRecord {
  if (!event.provider || !event.providerEventId || !event.organizationId || !event.evidenceReference || !event.bankAccountReference) {
    throw new Error("Banking event missing source identity, entity, or evidence");
  }
  if (!/^-?\d+$/.test(event.amountMinor)) throw new Error("Amount must be integer minor units");
  if (policy && policy.organizationId !== event.organizationId) throw new Error("Cross-organization policy forbidden");
  const posted = event.status === "posted";
  const eligible = posted && Boolean(policy?.approved) && policy?.backingType !== undefined;
  return {
    key: [event.organizationId, event.provider, event.providerEventId].join(":"),
    organizationId: event.organizationId,
    bankStatus: event.status,
    accountingStatus: event.status === "returned" || event.status === "reversed" ? "reversal-review" : posted ? "ready-for-review" : "pending",
    cesStatus: eligible ? "eligible-for-review" : "not-authorized",
    sourceAmountMinor: event.amountMinor,
    sourceCurrency: event.currency,
    policyId: policy?.policyId,
    evidenceReference: event.evidenceReference
  };
}
