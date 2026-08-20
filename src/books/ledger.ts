import type { JournalEntry, LedgerAccount, TrialBalanceRow } from "./types";

const ROUND = 1e8;
const round = (value: number) => Math.round(value * ROUND) / ROUND;

export class NeoLedger {
  private readonly accounts = new Map<string, LedgerAccount>();
  private readonly entries = new Map<string, JournalEntry>();

  constructor(accounts: LedgerAccount[] = []) {
    accounts.forEach((account) => this.accounts.set(account.id, account));
  }

  addAccount(account: LedgerAccount) {
    if (this.accounts.has(account.id)) throw new Error(`Account ${account.id} already exists`);
    this.accounts.set(account.id, account);
  }

  post(entry: JournalEntry) {
    if (this.entries.has(entry.id)) throw new Error(`Entry ${entry.id} already exists`);
    if (entry.lines.length < 2) throw new Error("A journal entry requires at least two lines");

    for (const line of entry.lines) {
      if (!this.accounts.has(line.accountId)) throw new Error(`Unknown account ${line.accountId}`);
      if (line.debit < 0 || line.credit < 0) throw new Error("Debit and credit values cannot be negative");
      if (line.debit > 0 && line.credit > 0) throw new Error("A journal line cannot contain both a debit and a credit");
    }

    const debit = round(entry.lines.reduce((sum, line) => sum + line.debit, 0));
    const credit = round(entry.lines.reduce((sum, line) => sum + line.credit, 0));
    if (debit !== credit) throw new Error(`Unbalanced journal entry: debit=${debit}, credit=${credit}`);

    const posted: JournalEntry = { ...entry, posted: true };
    this.entries.set(entry.id, posted);
    return posted;
  }

  listEntries() {
    return [...this.entries.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  trialBalance(): TrialBalanceRow[] {
    const totals = new Map<string, { debit: number; credit: number }>();
    this.accounts.forEach((_, accountId) => totals.set(accountId, { debit: 0, credit: 0 }));

    for (const entry of this.entries.values()) {
      for (const line of entry.lines) {
        const total = totals.get(line.accountId)!;
        total.debit = round(total.debit + line.debit);
        total.credit = round(total.credit + line.credit);
      }
    }

    return [...this.accounts.values()]
      .map((account) => {
        const total = totals.get(account.id)!;
        const normalDebit = account.type === "asset" || account.type === "expense";
        const balance = normalDebit ? total.debit - total.credit : total.credit - total.debit;
        return { ...account, debit: total.debit, credit: total.credit, balance: round(balance) };
      })
      .map(({ id, code, name, type, debit, credit, balance }) => ({ accountId: id, code, name, type, debit, credit, balance }));
  }
}
