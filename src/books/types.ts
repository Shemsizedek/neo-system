export type MoneyCurrency =
  | "USD"
  | "BTC"
  | "XCP"
  | "NOMNI"
  | (string & {});

export type LedgerSource =
  | "manual"
  | "bitcoin"
  | "counterparty"
  | "ces"
  | "neo-pay"
  | "neo-dex"
  | "neo-counter"
  | "neo-teller";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  currency?: MoneyCurrency;
  description?: string;
  active: boolean;
}

/**
 * debit/credit are always stated in the entity's functional (base) currency.
 * Native crypto/token quantity is retained independently for sub-ledger audit.
 */
export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  baseCurrency: MoneyCurrency;
  asset?: string;
  quantity?: number;
  unitPriceBase?: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  source: LedgerSource;
  baseCurrency: MoneyCurrency;
  externalId?: string;
  txHash?: string;
  blockHeight?: number;
  cesExchange?: string;
  lines: JournalLine[];
  metadata?: Record<string, unknown>;
  posted: boolean;
  createdAt: string;
}

export interface ImportedTransaction {
  id: string;
  source: LedgerSource;
  occurredAt: string;
  externalId: string;
  asset: string;
  quantity: number;
  fiatValue?: number;
  fiatCurrency?: MoneyCurrency;
  direction: "in" | "out" | "trade" | "fee";
  counterparty?: string;
  txHash?: string;
  blockHeight?: number;
  metadata?: Record<string, unknown>;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  baseCurrency: MoneyCurrency;
  debit: number;
  credit: number;
  balance: number;
}

export interface ReconciliationResult {
  source: LedgerSource;
  importedCount: number;
  matchedCount: number;
  unmatchedExternalIds: string[];
  duplicateExternalIds: string[];
}
