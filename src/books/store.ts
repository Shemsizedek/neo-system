import type { ImportedTransaction, JournalEntry, LedgerAccount, MoneyCurrency } from "./types";

export interface BooksOrganization {
  id: string;
  name: string;
  functionalCurrency: MoneyCurrency;
  fiscalYearStartMonth: number;
  createdAt: string;
}

export interface FiscalPeriod {
  id: string;
  organizationId: string;
  label: string;
  startsOn: string;
  endsOn: string;
  status: "open" | "review" | "locked";
}

export interface LedgerSourceConnection {
  id: string;
  organizationId: string;
  source: "bitcoin" | "counterparty" | "ces" | "neo-pay" | "neo-counter" | "neo-teller" | "neo-dex";
  label: string;
  externalReference?: string;
  status: "configured" | "syncing" | "ready" | "error";
  lastSyncedAt?: string;
}

export interface BooksSnapshot {
  organizations: BooksOrganization[];
  periods: FiscalPeriod[];
  accounts: LedgerAccount[];
  connections: LedgerSourceConnection[];
  importedTransactions: ImportedTransaction[];
  journalEntries: JournalEntry[];
}

export class BooksStore {
  private snapshot: BooksSnapshot;

  constructor(initial: BooksSnapshot) {
    this.snapshot = structuredClone(initial);
  }

  read(): BooksSnapshot {
    return structuredClone(this.snapshot);
  }

  replace(next: BooksSnapshot): void {
    this.snapshot = structuredClone(next);
  }

  addImportedTransaction(transaction: ImportedTransaction): void {
    if (this.snapshot.importedTransactions.some(row => row.id === transaction.id)) {
      throw new Error(`Duplicate imported transaction: ${transaction.id}`);
    }
    this.snapshot.importedTransactions.push(structuredClone(transaction));
  }

  addJournalEntry(entry: JournalEntry): void {
    if (this.snapshot.journalEntries.some(row => row.id === entry.id)) {
      throw new Error(`Duplicate journal entry: ${entry.id}`);
    }
    this.snapshot.journalEntries.push(structuredClone(entry));
  }
}
