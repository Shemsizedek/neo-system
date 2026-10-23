# Gate 40 — Idempotency Lookup & Safe Replay Contract

**Status: Review-only / NO-GO.** This is a pure helper and mock test suite, not an actual database lookup, provider integration, or production authorization.

## Decision contract

- Lookup unavailable or corrupt state: deny and do not invoke provider.
- No matching attempt: request a **new transactional reservation**, never directly invoke provider. An ambiguous previous commit may require authoritative transaction resolution first.
- Existing `reserved` or `started`: inspect durable invocation evidence. Even `reserved` is not proof that no paid call occurred.
- Existing `unknown`: reconcile with independently verified provider billing evidence.
- Existing `settled` or `reconciled`: return an already stored safe result reference; do not invoke provider again.

All `evaluateReplay` outputs set `invokeProvider: false` by design.

## Remaining blockers

A real adapter must provide durable lookup by tenant-scoped idempotency key, transactional uniqueness, proof of invocation state, protected result references, independently verified billing evidence, crash recovery, and multi-worker concurrency tests. External provider idempotency guarantees must be evaluated separately.

**Next gate:** Gate 41 — Tenant-scoped Idempotency Key Contract and Lookup Isolation.

No merges, migrations, deployments, billing changes, or financial commitments are authorized.
