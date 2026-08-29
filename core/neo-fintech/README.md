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

The NEOpay review layer captures exact user intent, composes unsigned bytes, independently inspects them, compares source/destination/asset/quantity/fee, persists rejected or verified review evidence, binds approval to the exact transaction hash, and records external signer handoff without storing keys or signatures. A mismatch returns HTTP 409 and withholds unsigned transaction bytes.

## Gate 5: Counterparty independent decode + authenticated idempotent approval

This gate closes the trust gap between composition and signing:

- `bitcoinxcp.InspectUnsigned` calls Counterparty Core API v2 `/v2/transactions/info?rawtransaction=<hex>` and consumes the endpoint's `unpacked_data` result.
- Only Counterparty `send` and `enhanced_send` message types are accepted by the NEOpay send inspector; unexpected types fail closed before approval.
- The decoded source, destination, asset, quantity and Bitcoin miner fee are converted into the independent `neopayreview.Inspection` contract.
- Authenticated review and approval boundaries require a `Principal` injected by upstream authentication and a mandatory `Idempotency-Key`.
- Idempotency scope is `(principal, operation, target, key)` plus a canonical semantic fingerprint. Same-key/different-input reuse is rejected.
- PostgreSQL serializes claims using the existing durable `fintech_idempotency` uniqueness constraint.
- Approval and the idempotency success transition commit in the same serializable database transaction.
- Approval handlers load the authoritative persisted review; client-supplied review status or transaction hashes are never trusted.
- Equivalent completed approval retries return the stored approval/review outcome instead of creating a second approval.

## Gate 6: externally signed transaction verification

This gate verifies the transaction again after an external wallet has signed it and before any broadcast capability can be considered:

- Counterparty transaction inspection now derives a SHA-256 `StructureHash` from decoded Bitcoin transaction structure after removing signature/unlocking-only fields such as `script_sig`, input witness data, and root transaction IDs that legitimately change when signatures are added.
- The signed transaction is independently decoded through the same fail-closed Counterparty send inspector.
- The decoded signed source, destination, asset, exact quantity, and miner fee must still match the approved NEOpay intent.
- The signed transaction's signature-independent structure hash must equal the reviewed unsigned structure hash. Output, payload, input-selection, sequence, version, lock-time, or fee-affecting mutations therefore reject the signed transaction.
- `SignedService` loads the authoritative approved review and approval from PostgreSQL; the caller cannot supply trusted review status or hashes.
- Both successful and rejected signed-verification evidence are durable.
- A separate `BroadcastAuthorization` can be recorded only for a verified signed transaction and is bound to its exact signed-transaction hash.
- Broadcast execution remains disabled. Recording authorization is not a network submission and is not evidence that Bitcoin or Counterparty accepted the transaction.
- This gate verifies transaction intent/structure, not cryptographic signature validity. Signature validation and actual broadcast/provider result handling remain a separate production gate.

`migrations/003_signed_transaction_verification.sql` adds the reviewed structure hash, signed-verification evidence, and broadcast-authorization evidence.

Counterparty Core's current API source exposes `/v2/transactions/info` and `/v2/transactions/unpack`; the `info` path parses raw transaction hex and includes decoded Bitcoin transaction structure plus unpacked Counterparty message data. Production deployment must pin an approved Counterparty endpoint, supply authentication middleware, configure PostgreSQL, and keep server-side signing and broadcast disabled until those separate gates are reviewed.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply `migrations/001_financial_core.sql`, `migrations/002_neopay_transaction_review.sql`, and `migrations/003_signed_transaction_verification.sql` in order before enabling durable persistence.
