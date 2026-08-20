import type { LedgerAccount } from "./types";

export const defaultChartOfAccounts: LedgerAccount[] = [
  { id: "1000", code: "1000", name: "Cash & Fiat", type: "asset", currency: "USD", active: true },
  { id: "1010", code: "1010", name: "Bitcoin Treasury", type: "asset", currency: "BTC", active: true },
  { id: "1020", code: "1020", name: "Counterparty XCP Treasury", type: "asset", currency: "XCP", active: true },
  { id: "1030", code: "1030", name: "NOMNI Treasury", type: "asset", currency: "NOMNI", active: true },
  { id: "1040", code: "1040", name: "CES Exchange Balances", type: "asset", active: true },
  { id: "1100", code: "1100", name: "Accounts Receivable", type: "asset", active: true },
  { id: "1200", code: "1200", name: "Digital Asset Inventory", type: "asset", active: true },
  { id: "2000", code: "2000", name: "Accounts Payable", type: "liability", active: true },
  { id: "2100", code: "2100", name: "Customer Deposits", type: "liability", active: true },
  { id: "2200", code: "2200", name: "Taxes Payable", type: "liability", active: true },
  { id: "3000", code: "3000", name: "Owner Equity", type: "equity", active: true },
  { id: "3100", code: "3100", name: "Retained Earnings", type: "equity", active: true },
  { id: "4000", code: "4000", name: "Sales Revenue", type: "revenue", active: true },
  { id: "4100", code: "4100", name: "Trading Revenue", type: "revenue", active: true },
  { id: "4200", code: "4200", name: "Service Revenue", type: "revenue", active: true },
  { id: "5000", code: "5000", name: "Cost of Goods Sold", type: "expense", active: true },
  { id: "5100", code: "5100", name: "Bitcoin Network Fees", type: "expense", active: true },
  { id: "5200", code: "5200", name: "Counterparty / Exchange Fees", type: "expense", active: true },
  { id: "5300", code: "5300", name: "Payroll Expense", type: "expense", active: true },
  { id: "5400", code: "5400", name: "Operating Expense", type: "expense", active: true },
  { id: "5500", code: "5500", name: "Professional Services", type: "expense", active: true }
];

export const accountByCode = new Map(defaultChartOfAccounts.map((account) => [account.code, account]));
