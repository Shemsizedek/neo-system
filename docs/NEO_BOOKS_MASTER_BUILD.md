# NEO Books — Master Build Specification

## Mission
NEO Books is the accounting and financial operations system for the NEO ecosystem. It is designed around double-entry accounting while treating Bitcoin, Counterparty XCP assets, and Community Exchange System (CES) activity as native transaction sources.

## Product family

### NEO Books
General ledger, chart of accounts, journal entries, bank and wallet reconciliation, invoicing, receivables, payables, fixed assets, financial statements, audit trail, multi-entity consolidation, and digital-asset accounting.

### NEO Pay
Merchant and customer payments, settlement routing, invoices, payment links, receivables automation, Bitcoin/XCP settlement, and integration with NEO Counter and NEO Teller.

### NEO Payroll
Worker profiles, time data, gross-to-net calculations, contractor payments, payroll journals, reporting exports, and controlled payout instructions. Regulatory calculations must be jurisdiction-configured and reviewed before production use.

### NEO Tax
Tax workpapers, transaction classification, gain/loss lots, business tax packages, filing exports, and jurisdiction-specific adapters. NEO Tax is a calculation and workflow layer, not a substitute for licensed tax advice.

### NEO Capital
Treasury, cash management, working-capital analytics, digital-asset positions, receivables finance, and NEO ecosystem financing workflows.

### NEO Commerce
Invoicing, estimates, subscriptions, catalog, customer ledger, sales tax data capture, POS feeds, and merchant analytics.

### NEO Workforce
Time, scheduling, contractor/vendor records, expense capture, approvals, and payroll handoff.

### NEO Advisor
NEOsync-assisted bookkeeping review, anomaly detection, close checklist, reconciliation suggestions, management reporting, and explainable accounting recommendations. Financial posting authority remains permission-controlled.

## Accounting architecture

1. **Source layer** — Bitcoin nodes/APIs, Counterparty services, CES exchanges, NEO Pay, NEO DEX, NEO Counter, NEO Teller, manual import.
2. **Normalization layer** — transforms source-specific records into a canonical `ImportedTransaction` model.
3. **Classification layer** — rules and NEOsync suggestions assign accounts, customers, vendors, projects, tax treatments, and dimensions.
4. **Ledger layer** — immutable balanced journal entries with source IDs, transaction hashes, block heights, and metadata.
5. **Reconciliation layer** — matches imported records against posted entries and flags missing or duplicate items.
6. **Reporting layer** — trial balance, profit and loss, balance sheet, cash flow, digital-asset schedules, and management reports.
7. **Audit layer** — actor, timestamp, source evidence, approval history, and adjustment trail.

## Digital asset accounting model

Every digital-asset movement must preserve both quantity and reporting-currency valuation. The ledger must never use token quantity as if it were fiat value. A production valuation service will attach price source, timestamp, quote currency, and valuation method to each recognized transaction.

Counterparty assets are identified by asset name/ID plus Bitcoin transaction evidence. Bitcoin transactions preserve txid and block height when available. CES records preserve exchange identity and source trade/transfer IDs.

## Initial chart of accounts
The codebase includes dedicated accounts for Bitcoin treasury, XCP treasury, NOMNI treasury, CES balances, digital-asset inventory, network fees, trading revenue, customer deposits, taxes payable, and standard operating accounts.

## Security and controls

- Never store seed phrases or private keys in the accounting database.
- Wallet signing remains isolated from bookkeeping.
- Production posting should support maker/checker approval rules.
- Imported source records should be immutable after ingestion.
- Manual journal adjustments require an audit reason.
- Idempotency keys are required for all connector imports.
- Monetary calculations must migrate to fixed-point/decimal arithmetic before production financial reporting.
- CES credential automation must use encrypted secrets and authorized APIs or approved browser automation; credentials must never be committed to GitHub.

## Delivery roadmap

### Phase 1 — Foundation
- Canonical accounting types
- NEO chart of accounts
- Double-entry ledger validation
- BTC/XCP/CES normalization contracts
- Reconciliation engine
- Trial balance, income statement, balance sheet

### Phase 2 — Working application
- NEO Books dashboard
- Company/entity setup
- Wallet and exchange connections
- Transaction inbox
- Rules-based categorization
- Journal and account register UI
- Reconciliation workspace
- P&L, balance sheet, cash flow
- CSV/JSON import/export

### Phase 3 — Commercial operations
- Customers, vendors, invoices, bills
- NEO Pay settlement
- NEO Counter sales feeds
- NEO Teller cash movement feeds
- Multi-user roles and approvals
- Document/receipt attachments
- Month-end close workflow

### Phase 4 — Intuit-class suite
- NEO Payroll
- NEO Tax
- NEO Commerce
- NEO Workforce
- NEO Capital
- NEO Advisor
- Multi-entity consolidation
- Accountant/advisor portal
- Public developer API and webhooks

## Current implementation
The initial source is under `src/books/` and intentionally contains no wallet-signing or custody logic. The accounting system observes, normalizes, classifies, reconciles, and reports transactions; custody and signing remain separate security domains.
