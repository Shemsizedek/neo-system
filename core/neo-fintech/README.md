# NEO Fintech Core

A Go 1.24 financial kernel for NEO services. It is intentionally rail-agnostic: BTC, Counterparty/XCP, CES, card/bank, or other adapters must supply authoritative evidence under their own deployed contracts.

## Invariants

- Money uses integer minor units plus currency/asset code; no binary floating point in postings.
- Every committed journal balances per currency and corrections use reversal/adjustment evidence rather than history mutation.
- Authorization, capture, refund, reversal, dispute, clearing, settlement, and payout are separate evidence domains.
- Idempotency is scoped to principal + operation + target and binds to a semantic fingerprint.
- Ambiguous provider outcomes keep the same provider operation identity and are reconciled before any new operation is issued.
- Reconciliation is item-level; missing or mismatched money becomes an explicit exception.

## Gate 2: durable state and rail contracts

This gate adds:

- PostgreSQL schema for immutable journals, entries, idempotency claims, provider evidence, and reconciliation exceptions.
- Serializable journal persistence through `database/sql`.
- Atomic idempotency claims backed by a database uniqueness constraint.
- A provider-neutral `rails.Adapter` contract with submit/query separation. Acceptance for processing is never treated as financial success.
- Reconciliation match primitives that require both internal and external evidence and exact currency-preserving amounts.

The service still does **not** move live funds, hold private keys, sign Bitcoin transactions, or claim live BTC/XCP/CES/bank connectivity. A concrete PostgreSQL driver, migrations at deployment, authenticated service boundaries, and verified rail-specific adapters are subsequent gates.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply `migrations/001_financial_core.sql` to the selected PostgreSQL database before enabling durable persistence.
