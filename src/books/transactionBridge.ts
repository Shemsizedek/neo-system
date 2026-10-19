import type { JournalEntry } from "./types";
import { NeoLedger } from "./ledger";

export type NeoFinancialSource = "neo-ledger" | "neo-treasury" | "neo-pay" | "neo-counter" | "neo-teller" | "neo-dex" | "neo-bank" | "neo-credit" | "ces" | "bitcoin" | "counterparty";

export interface FinancialEvent {
  eventId: string;
  organizationId: string;
  source: NeoFinancialSource;
  sourceTransactionId: string;
  occurredAt: string;
  asset: string;
  quantity: string;
  evidenceReference: string;
  status: "observed" | "settled" | "reversed";
}

export interface AccountingDecision {
  eventId: string;
  status: "pending-valuation" | "pending-classification" | "pending-approval" | "posted" | "exception";
  journalEntryId?: string;
  reason?: string;
}

export class NeoBooksTransactionBridge {
  private readonly decisions = new Map<string, AccountingDecision>();
  constructor(private readonly ledger: NeoLedger) {}

  receive(event: FinancialEvent): AccountingDecision {
    if (!event.eventId || !event.organizationId || !event.sourceTransactionId || !event.evidenceReference) {
      throw new Error("Financial event lacks required identity or provenance");
    }
    const existing = this.decisions.get(event.eventId);
    if (existing) return { ...existing };
    const decision: AccountingDecision = {
      eventId: event.eventId,
      status: event.status === "settled" ? "pending-valuation" : "pending-classification"
    };
    this.decisions.set(event.eventId, decision);
    return { ...decision };
  }

  postApproved(event: FinancialEvent, entry: JournalEntry, approved: boolean): AccountingDecision {
    const current = this.decisions.get(event.eventId);
    if (!current) throw new Error("Event must be received before posting");
    if (current.status === "posted") return { ...current };
    if (event.status !== "settled") throw new Error("Only settled events can be posted");
    if (!approved) throw new Error("Posting requires explicit approval");
    if (entry.externalId !== event.sourceTransactionId) throw new Error("Source transaction mismatch");
    const posted = this.ledger.post(entry);
    const decision: AccountingDecision = { eventId: event.eventId, status: "posted", journalEntryId: posted.id };
    this.decisions.set(event.eventId, decision);
    return { ...decision };
  }
}
