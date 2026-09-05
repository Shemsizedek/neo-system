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

The first concrete rail lives in `internal/rails/bitcoinxcp` and supports read/compose evidence without private-key custody.

## Gate 4: NEOpay transaction review and signer handoff

NEOpay captures exact intent, composes unsigned bytes, independently inspects them, records mismatch evidence, binds approval to exact unsigned bytes, and hands only approved transactions to an external signer.

## Gate 5: Counterparty independent decode + authenticated idempotent approval

Counterparty API v2 `/v2/transactions/info` is used as an independent raw-transaction decode path. Review/approval operations are authenticated and scoped by principal, operation, target, idempotency key, and semantic fingerprint.

## Gate 6: externally signed transaction verification

After external signing, NEOpay independently decodes the transaction again. Source, destination, asset, quantity, fee, and a signature-independent Bitcoin transaction structure hash must still match the approved transaction. Mutated signed transactions are rejected and preserved as evidence.

## Gate 7: Bitcoin Core validation + controlled broadcast

This gate adds a full-node validation and submission boundary:

- `internal/rails/bitcoinrpc` talks to Bitcoin Core JSON-RPC over HTTPS, with plain HTTP permitted only for loopback development nodes.
- `testmempoolaccept` is mandatory before broadcast authority. An `allowed=true` result proves the signed transaction passed the node's current consensus and mempool-policy checks, including input script/signature validation, without adding it to the mempool.
- Rejected validation evidence is durable and cannot produce broadcast authorization.
- Broadcast authorization is bound to the semantic verification, Bitcoin Core validation, exact signed-transaction hash, and Bitcoin txid.
- A broadcast attempt is persisted as `prepared` before `sendrawtransaction` is invoked.
- The Bitcoin txid is the stable provider-operation identity for that exact signed transaction.
- A transport failure after submission becomes `ambiguous`; the system does not issue a second broadcast attempt merely because the response was lost.
- Ambiguous attempts are reconciled with node evidence (`getmempoolentry`, then `getrawtransaction`) and become accepted only when the same txid is observed.
- Equivalent accepted replays return the stored attempt and do not call `sendrawtransaction` again.
- Server-side private keys remain disabled. Broadcast is not registered as a public route and `live_funds_enabled` remains false.

`migrations/004_bitcoin_validation_broadcast.sql` adds Bitcoin Core validation evidence and durable broadcast-attempt state.

Run:

```bash
cd core/neo-fintech
go test ./...
go run ./cmd/neofintech
```

Apply migrations `001` through `004` in order before enabling durable persistence.
