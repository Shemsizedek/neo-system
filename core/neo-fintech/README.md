# NEO Fintech Core

A Go 1.24 financial kernel for NEO services. It is intentionally rail-aware but provider-contract driven: BTC, Counterparty/XCP, CES, card/bank, or other adapters must supply authoritative evidence under their own deployed contracts.

## Invariants

- Money uses integer minor units plus currency/asset code; no binary floating point in postings.
- Every committed journal balances per currency and corrections use reversal/adjustment evidence rather than history mutation.
- Authorization, capture, refund, reversal, dispute, clearing, settlement, and payout are separate evidence domains.
- Idempotency is scoped to principal + operation + target and binds to a semantic fingerprint.
- Ambiguous provider outcomes keep the same provider operation identity and are reconciled before any new operation is issued.
- Reconciliation is item-level; missing or mismatched money becomes an explicit exception.

## Gate 2: durable state and rail contracts

This gate added:

- PostgreSQL schema for immutable journals, entries, idempotency claims, provider evidence, and reconciliation exceptions.
- Serializable journal persistence through `database/sql`.
- Atomic idempotency claims backed by a database uniqueness constraint.
- A provider-neutral `rails.Adapter` contract with submit/query separation. Acceptance for processing is never treated as financial success.
- Reconciliation match primitives that require both internal and external evidence and exact currency-preserving amounts.

## Gate 3: Bitcoin + Counterparty/XCP read-compose rail

The first concrete rail lives in `internal/rails/bitcoinxcp` and intentionally supports **read and compose only**:

- Bitcoin transaction lookup returns mempool-observed or block-confirmed evidence with payload hashing.
- Counterparty API v2 composition uses `/v2/addresses/<address>/compose/send` and returns an unsigned/raw transaction for external review and signing.
- Counterparty transaction reconciliation uses `/v2/transactions/<tx_hash>/events` rather than inferring token state from Bitcoin confirmation alone.
- Counterparty readiness headers are checked when present.
- Asset quantities remain exact integer base units and miner fees are bounded in satoshis by a configured maximum.
- `Submit` is disabled: this service does not broadcast transactions.
- Private-key signing is outside this service boundary.

The adapter URLs are configuration inputs; adding an adapter does not by itself prove a production provider is available, trusted, synchronized, or authorized. Production deployment must pin the actual Bitcoin/Counterparty endpoints, authenticate protected providers where applicable, verify their operating contract, persist evidence, and define confirmation/finality policy appropriate to the product.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply `migrations/001_financial_core.sql` to the selected PostgreSQL database before enabling durable persistence.
