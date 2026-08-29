# NEO Fintech Core

A Go 1.24 financial kernel for NEO services. It is intentionally rail-agnostic: adapters for BTC, Counterparty/XCP, CES, card/bank providers, or other settlement systems must supply authoritative provider evidence rather than being inferred from HTTP success.

## Invariants

- Money uses integer minor units plus currency; no binary floating point in postings.
- Every committed journal balances per currency and history is corrected by reversal/adjustment, never mutation.
- Payment authorization, capture, refund, reversal, dispute, and settlement remain distinct states/evidence domains.
- Idempotency is scoped to principal + operation + target and binds to a semantic fingerprint.
- Ambiguous provider outcomes are reconciled under the same provider operation identity; retries never mint a new payment identity just because a response was lost.
- Settlement reconciliation is item-level and exceptions are explicit.

## Current gate

This first gate establishes compileable domain primitives and tests. It does **not** move real funds, hold private keys, sign Bitcoin transactions, or claim connectivity to SWIFT/FedNow/CES/Counterparty. Provider adapters and durable storage are the next gate.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

HTTP endpoints: `GET /healthz` and `GET /v1/capabilities`.
