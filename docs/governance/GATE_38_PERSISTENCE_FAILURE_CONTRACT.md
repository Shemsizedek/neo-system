# Gate 38 — Persistence Adapter Contract and Failure Injection

**Status:** Review-only, mock-only; no durable storage, migrations, provider calls, or spending.

The `ledger-fault-adapter.mjs` wrapper models failure *before* a mock ledger operation. It does not model partial database commits, post-commit response loss, process restarts, or distributed workers. Its tests verify that a failed mock operation does not accidentally release budget.

## Future adapter contract

- `reserve(accountId, idempotencyKey, amountMicrousd)`: transactional account lock, unique attempt key, and capacity check, all committed before any paid provider call.
- `start(attemptId)`: durable state transition before provider invocation.
- `markUnknown(attemptId, reasonCode)`: hold reservation on ambiguous provider outcome; never release on timeout.
- `settle(attemptId, verifiedBillingEvidence)`: transactional, idempotent settlement from trusted evidence.
- `reconcile(attemptId, verifiedBillingEvidence)`: distinct unknown-to-reconciled transition, with immutable audit event.
- `getAttempt(attemptId)`: safe replay result without repeating paid provider execution.
- `getBudget(accountId)`: read from shared authoritative storage, not per-process counters.

## Required next tests

1. Inject failure before and after database commit; verify replay cannot duplicate charges.
2. Kill and restart a worker after reservation, provider start, and settlement; verify durable recovery.
3. Race two independent workers on the last available budget using a real transactional test database.
4. Test unique constraints, isolation level, deadlocks, retries, and transaction rollback.
5. Verify billing evidence authenticity and handling of delayed invoices or charges exceeding reservations.
6. Verify data redaction, retention, HMAC rotation, role permissions, and audit immutability.

**Release decision:** NO-GO. Production requires approved budget policy, real durable adapter, database and provider-side safeguards, staging verification, and human authorization.

**Next gate:** Gate 39 — Transactional Adapter Test Harness and Commit-Acknowledgment Failure Model.
