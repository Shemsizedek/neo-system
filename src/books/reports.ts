import type { TrialBalanceRow } from "./types";

export interface IncomeStatement {
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface BalanceSheet {
  assets: number;
  liabilities: number;
  equity: number;
  retainedEarningsAdjustment: number;
  balanced: boolean;
}

const sumType = (rows: TrialBalanceRow[], type: TrialBalanceRow["type"]) =>
  rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.balance, 0);

export function incomeStatement(rows: TrialBalanceRow[]): IncomeStatement {
  const revenue = sumType(rows, "revenue");
  const expenses = sumType(rows, "expense");
  return { revenue, expenses, netIncome: revenue - expenses };
}

export function balanceSheet(rows: TrialBalanceRow[]): BalanceSheet {
  const assets = sumType(rows, "asset");
  const liabilities = sumType(rows, "liability");
  const equity = sumType(rows, "equity");
  const { netIncome } = incomeStatement(rows);
  const rightSide = liabilities + equity + netIncome;
  return {
    assets,
    liabilities,
    equity,
    retainedEarningsAdjustment: netIncome,
    balanced: Math.abs(assets - rightSide) < 0.00000001
  };
}
