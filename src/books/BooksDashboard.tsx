import {
  Activity,
  Bitcoin,
  BookOpen,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  Link2,
  ReceiptText,
  Scale,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { defaultChartOfAccounts } from "./chartOfAccounts";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);

const sourceStatus = [
  { name: "Bitcoin", detail: "Wallet and chain activity", state: "READY", icon: Bitcoin },
  { name: "Counterparty XCP", detail: "Assets, sends, trades and fees", state: "READY", icon: CircleDollarSign },
  { name: "CES", detail: "Community Exchange System trades", state: "ADAPTER", icon: Link2 },
  { name: "NEO Pay", detail: "Payments and settlement events", state: "PLANNED", icon: WalletCards }
] as const;

const activity = [
  { id: "BTC-DEMO-001", source: "Bitcoin", memo: "BTC treasury receipt", amount: 18750, status: "MATCHED" },
  { id: "XCP-DEMO-002", source: "Counterparty", memo: "NOMNI asset receipt", amount: 12400, status: "MATCHED" },
  { id: "CES-DEMO-003", source: "CES", memo: "CES trade awaiting source statement", amount: 6250, status: "REVIEW" }
] as const;

export function BooksDashboard() {
  const assets = 246500;
  const liabilities = 38200;
  const equity = 176300;
  const netIncome = 32000;

  return <>
    <section className="principles">
      <span>Double Entry</span><span>Functional Currency</span><span>Crypto Sub-ledgers</span><span>Source Reconciliation</span><span>Audit Trail</span>
    </section>

    <section className="stats">
      <div className="card stat"><div><span>Total Assets</span><strong>{money(assets)}</strong><small>Functional currency value</small></div><Landmark size={22}/></div>
      <div className="card stat"><div><span>Net Income</span><strong>{money(netIncome)}</strong><small>Current reporting period</small></div><ReceiptText size={22}/></div>
      <div className="card stat"><div><span>Connected Sources</span><strong>3</strong><small>BTC • XCP • CES</small></div><Link2 size={22}/></div>
      <div className="card stat"><div><span>Books Status</span><strong>BALANCED</strong><small>Assets = liabilities + equity + income</small></div><Scale size={22}/></div>
    </section>

    <section className="focusgrid">
      <div className="card focus">
        <BookOpen size={26}/><h2>NEO Books Accounting Core</h2>
        <p>NEO Books records accounting values in the entity functional currency while preserving BTC, XCP, NOMNI and other asset quantities in dedicated sub-ledger fields. Blockchain or CES activity is never treated as a journal entry until it is valued, classified and posted.</p>
      </div>
      <div className="card focus">
        <ShieldCheck size={26}/><h2>Custody Boundary</h2>
        <p>Accounting connectors may read addresses, transactions, balances and market metadata. Private keys, seed phrases and transaction signing remain outside NEO Books.</p>
      </div>
    </section>

    <section className="modulegrid">
      {sourceStatus.map(({name,detail,state,icon:Icon}) => <article className="card module" key={name}>
        <div className="modulehead"><Icon size={20}/><span className={state === "READY" ? "status active" : "status foundation"}>{state}</span></div>
        <h2>{name}</h2><p>{detail}</p>
        <div className="boundary"><Activity size={14}/><span>Read/import → normalize → value → reconcile → post</span></div>
      </article>)}
    </section>

    <section className="grid">
      <div className="card panel">
        <div className="paneltitle"><div><span>Balance Sheet Snapshot</span><small>USD functional currency</small></div><Scale size={18}/></div>
        <div className="machines">
          <div className="machine"><div><b>Assets</b><span>Cash, BTC, XCP and digital assets</span></div><div className="reserve"><b>{money(assets)}</b></div></div>
          <div className="machine"><div><b>Liabilities</b><span>Payables and obligations</span></div><div className="reserve"><b>{money(liabilities)}</b></div></div>
          <div className="machine"><div><b>Equity</b><span>Contributed and retained capital</span></div><div className="reserve"><b>{money(equity)}</b></div></div>
          <div className="machine"><div><b>Current Net Income</b><span>Revenue less expenses</span></div><div className="reserve"><b>{money(netIncome)}</b></div></div>
        </div>
      </div>
      <div className="card panel">
        <div className="paneltitle"><div><span>Product Suite</span><small>NEO financial operating stack</small></div><CircleDollarSign size={18}/></div>
        <div className="machines">
          {[
            ["NEO Books", "Accounting and reporting"],
            ["NEO Pay", "Payments and merchant settlement"],
            ["NEO Payroll", "Payroll and contractor operations"],
            ["NEO Tax", "Tax workpapers and reporting"],
            ["NEO Capital", "Treasury, financing and private markets"],
            ["NEO Advisor", "NEOsync accounting intelligence"]
          ].map(([name,detail]) => <div className="machine" key={name}><div><b>{name}</b><span>{detail}</span></div><em className="online">ROADMAP</em></div>)}
        </div>
      </div>
    </section>

    <section className="card tablecard">
      <div className="paneltitle"><div><span>Reconciliation Queue</span><small>Demonstration records until live connectors are configured</small></div><FileCheck2 size={18}/></div>
      <div className="tablewrap"><table><thead><tr><th>ID</th><th>Source</th><th>Description</th><th>Value</th><th>Status</th></tr></thead><tbody>
        {activity.map(row => <tr key={row.id}><td className="mono">{row.id}</td><td>{row.source}</td><td>{row.memo}</td><td>{money(row.amount)}</td><td><span className={row.status === "MATCHED" ? "pill authorized" : "pill pending"}>{row.status}</span></td></tr>)}
      </tbody></table></div>
    </section>

    <section className="card tablecard">
      <div className="paneltitle"><div><span>Chart of Accounts</span><small>Crypto-aware starter ledger</small></div><BookOpen size={18}/></div>
      <div className="tablewrap"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Currency / Asset</th><th>Status</th></tr></thead><tbody>
        {defaultChartOfAccounts.map(account => <tr key={account.id}><td className="mono">{account.code}</td><td>{account.name}</td><td>{account.type.toUpperCase()}</td><td>{account.currency ?? "USD"}</td><td><span className="pill authorized">ACTIVE</span></td></tr>)}
      </tbody></table></div>
    </section>
  </>;
}
