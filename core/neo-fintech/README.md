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

This gate added PostgreSQL-backed journal/idempotency/evidence schemas, serializable journal persistence, atomic idempotency claims, provider-neutral rail contracts, and item-level reconciliation primitives.

## Gate 3: Bitcoin + Counterparty/XCP read-compose rail

The first concrete rail lives in `internal/rails/bitcoinxcp` and intentionally supports **read and compose only**. It provides Bitcoin transaction evidence, Counterparty API v2 send composition through `/v2/addresses/<address>/compose/send`, transaction-event reconciliation through `/v2/transactions/<tx_hash>/events`, readiness checks, exact integer asset quantities, and bounded miner fees in satoshis. `Submit` remains disabled and private-key signing remains outside this service boundary.

## Gate 4: NEOpay transaction review and signer handoff

The NEOpay review layer lives in `internal/neopayreview` and enforces review-before-signing:

1. Capture exact user intent: source, destination, asset, quantity in base units, and miner fee in satoshis.
2. Compose unsigned transaction bytes through an injected compose function.
3. Decode/inspect those bytes through a separately injected inspector. Missing independent inspection fails closed.
4. Compare decoded source, destination, asset, quantity, and fee against intent. Any mismatch becomes durable rejected-review evidence.
5. Bind the review to a SHA-256 hash of the exact unsigned transaction bytes.
6. Allow approval only for a verified review and reject approval if the unsigned bytes changed after review.
7. Persist review, approval, and external signer-handoff evidence separately. Approval never stores or implies a private key, signature, or broadcast result.
8. The review HTTP handler returns HTTP 409 and withholds unsigned transaction bytes when inspection does not match intent.

`migrations/002_neopay_transaction_review.sql` adds append-only review, approval, and signer-handoff records. `neopayreview.PrepareHandler` supplies the HTTP review-handler contract, but the standalone binary deliberately does not register it until authentication, durable storage, idempotency middleware, a concrete composer, and an independent decoder/inspector are injected.

Counterparty Core API v2 documents `/transactions/info` and `/transactions/unpack` as supported transaction parsing helpers. The exact request contract must be verified against the deployed Core version before wiring the production inspector. Until then the service remains fail-closed rather than guessing provider parameters or treating compose-response fields as independent evidence.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply `migrations/001_financial_core.sql` and `migrations/002_neopay_transaction_review.sql` to the selected PostgreSQL database before enabling durable persistence.
