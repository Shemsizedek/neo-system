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

## Gate 4: NEOpay transaction review and signer handoff

The NEOpay review layer lives in `internal/neopayreview` and enforces a review-before-signing workflow:

1. Capture the exact user intent: source, destination, asset, quantity in base units, and miner fee in satoshis.
2. Compose an unsigned transaction through an injected compose function.
3. Decode/inspect those unsigned bytes through a separately injected inspector. If an independent inspector is not configured, the review fails closed.
4. Compare decoded source, destination, asset, quantity, and fee against the user's intent. Any mismatch becomes durable rejected-review evidence.
5. Hash the exact unsigned transaction bytes and bind that hash to the review.
6. Approval is allowed only for a verified review and is rejected if the unsigned transaction bytes change after review.
7. Persist review, approval, and external signer-handoff evidence separately. No private key, signature, or broadcast result is stored or implied by approval.

`migrations/002_neopay_transaction_review.sql` adds append-only review, approval, and signer-handoff records. `neopayreview.PrepareHandler` provides the HTTP handler contract, but the standalone binary deliberately does not register it until authentication, durable storage, idempotency middleware, a concrete composer, and an independent decoder/inspector are injected.

Counterparty Core API v2 documents `/transactions/info` and `/transactions/unpack` as the supported parse/unpack helpers. The exact query/body contract must be verified against the deployed Counterparty Core version before wiring the production inspector. Until then, the review service remains fail-closed rather than guessing parameter names or trusting compose-response fields as independent evidence.

The adapter URLs are configuration inputs; adding an adapter does not by itself prove a production provider is available, trusted, synchronized, or authorized. Production deployment must pin the actual Bitcoin/Counterparty endpoints, authenticate protected providers where applicable, verify their operating contract, persist evidence, and define confirmation/finality policy appropriate to the product.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply `migrations/001_financial_core.sql` and `migrations/002_neopay_transaction_review.sql` to the selected PostgreSQL database before enabling durable persistence.
