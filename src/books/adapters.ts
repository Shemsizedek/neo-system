import type { ImportedTransaction, JournalEntry, LedgerSource, MoneyCurrency, ReconciliationResult } from "./types";

export interface LedgerConnector {
  readonly source: LedgerSource;
  fetchTransactions(cursor?: string): Promise<{ transactions: ImportedTransaction[]; nextCursor?: string }>;
}

export interface BitcoinActivity {
  txid: string;
  timestamp: string;
  amountBtc: number;
  direction: "in" | "out";
  feeBtc?: number;
  blockHeight?: number;
  counterparty?: string;
}

export function normalizeBitcoin(activity: BitcoinActivity): ImportedTransaction[] {
  const rows: ImportedTransaction[] = [{
    id: `bitcoin:${activity.txid}:${activity.direction}`,
    source: "bitcoin",
    occurredAt: activity.timestamp,
    externalId: activity.txid,
    asset: "BTC",
    quantity: Math.abs(activity.amountBtc),
    direction: activity.direction,
    counterparty: activity.counterparty,
    txHash: activity.txid,
    blockHeight: activity.blockHeight
  }];

  if ((activity.feeBtc ?? 0) > 0) {
    rows.push({
      id: `bitcoin:${activity.txid}:fee`,
      source: "bitcoin",
      occurredAt: activity.timestamp,
      externalId: `${activity.txid}:fee`,
      asset: "BTC",
      quantity: activity.feeBtc!,
      direction: "fee",
      txHash: activity.txid,
      blockHeight: activity.blockHeight
    });
  }
  return rows;
}

export interface CounterpartyActivity {
  id: string;
  timestamp: string;
  txHash: string;
  asset: string;
  quantity: number;
  direction: "in" | "out" | "trade";
  blockHeight?: number;
  counterparty?: string;
  fiatValue?: number;
  fiatCurrency?: MoneyCurrency;
}

export function normalizeCounterparty(activity: CounterpartyActivity): ImportedTransaction {
  return {
    id: `counterparty:${activity.id}`,
    source: "counterparty",
    occurredAt: activity.timestamp,
    externalId: activity.id,
    asset: activity.asset,
    quantity: Math.abs(activity.quantity),
    fiatValue: activity.fiatValue,
    fiatCurrency: activity.fiatCurrency,
    direction: activity.direction,
    counterparty: activity.counterparty,
    txHash: activity.txHash,
    blockHeight: activity.blockHeight
  };
}

export interface CesActivity {
  exchange: string;
  tradeId: string;
  timestamp: string;
  asset: string;
  quantity: number;
  fiatValue?: number;
  fiatCurrency?: MoneyCurrency;
  direction: "in" | "out" | "trade" | "fee";
  counterparty?: string;
}

export function normalizeCes(activity: CesActivity): ImportedTransaction {
  return {
    id: `ces:${activity.exchange}:${activity.tradeId}`,
    source: "ces",
    occurredAt: activity.timestamp,
    externalId: `${activity.exchange}:${activity.tradeId}`,
    asset: activity.asset,
    quantity: Math.abs(activity.quantity),
    fiatValue: activity.fiatValue,
    fiatCurrency: activity.fiatCurrency,
    direction: activity.direction,
    counterparty: activity.counterparty,
    metadata: { exchange: activity.exchange }
  };
}

export function reconcile(source: LedgerSource, imported: ImportedTransaction[], entries: JournalEntry[]): ReconciliationResult {
  const postedIds = new Set(entries.filter((entry) => entry.source === source).map((entry) => entry.externalId).filter(Boolean));
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  let matchedCount = 0;

  for (const transaction of imported) {
    if (seen.has(transaction.externalId)) duplicates.add(transaction.externalId);
    seen.add(transaction.externalId);
    if (postedIds.has(transaction.externalId)) matchedCount += 1;
  }

  return {
    source,
    importedCount: imported.length,
    matchedCount,
    unmatchedExternalIds: imported.filter((row) => !postedIds.has(row.externalId)).map((row) => row.externalId),
    duplicateExternalIds: [...duplicates]
  };
}
