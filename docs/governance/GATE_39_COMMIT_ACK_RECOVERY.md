# Gate 39 — Commit-Acknowledgment Failure Recovery

**Status: Review-only / NO-GO.** No real database or provider interaction.

## Scenario

A reservation or settlement can commit while its acknowledgment is lost. The client must treat this as **unknown**, not as a definite rollback, and must not blindly issue a new paid provider attempt.

## Mock evidence

The `ledger-ack-loss-adapter.mjs` executes a mock ledger operation and intentionally suppresses its first successful acknowledgment. Tests verify that a retry with the same idempotency key cannot double reserve; a settlement retry cannot double settle; and an unknown-charge reservation remains held.

This model is synchronous and in memory. It does **not** prove network partitions, crash persistence, or multi-instance isolation.

## Future durable adapter requirements

1. Reserve and commit before invoking a paid provider.
2. On ambiguous commit result, query the authoritative database using the original idempotency key. Do not use a new key.
3. A found reservation is not permission to invoke the provider again; check durable invocation state and provider idempotency support.
4. A missing reservation after an ambiguous commit requires careful transaction-status verification, not an automatic paid retry.
5. Settlement/reconciliation must use unique verified evidence IDs and transactional state transitions; replay returns existing result.
6. Preserve reservations for unknown provider outcomes until independently verified reconciliation.
7. Test with real database transaction boundaries, two worker processes, injected connection loss after COMMIT, and process restarts.

**Next gate:** Gate 40 — Durable Idempotency-Key Lookup and Replay Contract (mock-only).

**Release decision:** NO-GO pending security, privacy, finance and deployment approvals.
