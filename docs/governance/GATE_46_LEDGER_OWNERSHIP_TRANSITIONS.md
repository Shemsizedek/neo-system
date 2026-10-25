# Gate 46 — Tenant Ownership for Ledger Lifecycle Transitions

**Decision: REVIEW-ONLY / NO-GO.** This changes only mock contracts and tests on a draft security branch. No live HTTP routes, authentication provider, provider billing, persistent database, production traffic, or spending limits are modified.

## Verified prerequisite

Gate 45 CI run `40215008171` completed successfully on commit `d5b7f129eb114b05f1bba623fb102ecb0ca1a036`. Its tenant-bound capability supported only reserve and lookup.

## Gate 46 contract

`createServerBoundTenantLedger({ principalFactory, registry })` now requires the full mock registry interface: `reserve`, `lookup`, `start`, `unknown`, `settle`, and `reconcile`. The server's trusted principal factory is bound once. Every capability method reconstructs an internal operation containing the authenticated tenant captured in its closure. The client-facing operations accept **only**:

| Operation | Strict input | Expected effect |
| --- | --- | --- |
| reserve | `{key, attempt:{state:'reserved', maxChargeMicrousd?}}` | One record in caller's tenant namespace |
| lookup | `{key}` | Tenant-local copy of attempt state |
| start | `{key}` | `reserved -> started` only if a positive safe-integer mock charge ceiling exists |
| unknown | `{key}` | `reserved/started -> unknown` only for a priced mock reservation |
| settle | `{key,billedMicrousd}` | `started -> settled` with nonnegative safe-integer cost <= reserved mock ceiling |
| reconcile | `{key,billedMicrousd}` | `unknown -> reconciled` with nonnegative safe-integer cost <= ceiling |

Raw tenant IDs, tenant overrides, unexpected input fields and attempts to change another tenant's state are rejected or cannot find a record. Existing Gate 45 state-only reservations remain readable and reservable for backward compatibility, but **cannot transition to started or charged** without a positive ceiling. Invalid transitions and replays fail closed; completed transitions are not reapplied. Registry errors return a generic `ledger_unavailable` response.

The tests exercise same-key A/B tenant isolation across distinct outcomes, cross-tenant missing keys on **every** transition, bounded amounts, unknown-charge reconciliation, duplicate settlement denial, attempts to inject tenant identifiers into every method, legacy unpriced reservations and thrown backend errors.

## What this does not establish

- The `maxChargeMicrousd` input is only a per-record MOCK bound; the registry **does not reserve funds**, enforce tenant-level/daily/monthly aggregate budgets, or maintain a durable accounting balance. An `unknown` state is a logical hold, not a persisted financial reserve.
- `billedMicrousd` is entirely a caller-supplied TEST VALUE. This is **not** independently verified provider billing evidence and cannot authorize real settlement or reconciliation.
- Tenant ownership is enforced only when callers use the **trusted bound wrapper**. The underlying test registry still accepts raw `authenticatedTenant` strings; never expose it directly.
- Principal factories here use a supplied mock verifier callback; there is no real token signature/issuer/audience validation, revocation, membership refresh, role-based permission enforcement, or live route integration.
- The in-memory Maps are not transactional across worker processes and are lost on restart. There is no durable idempotency, post-commit acknowledgment recovery, provider charge protection, or true multi-tenant database authorization.
- Administrative snapshots, deletions, billing evidence ingestion, support actions and any future ledger operations need explicit tenant/role authorization and must not reuse or leak capability objects.

## Required production acceptance gates

1. Audit the real authentication and authorized tenant membership source. Keep the factory and registry private in a server-only module.
2. Design a database-backed, tenant-keyed ledger with atomic reservation, start, unknown, settlement and reconciliation transitions and a verified cost-evidence authority.
3. Validate each transition under multi-worker concurrency, process crash/restart, replay after lost acknowledgments and unauthorized cross-tenant resource-ID requests.
4. Establish approved USD cost ceilings, provider allowlists, privacy retention, monitoring, emergency stop and human release decision.
5. Pass staging HTTP authorization tests with real database access policies.

**Next gate:** Gate 47 — Verified Billing Evidence and Tenant-Scoped Reconciliation Contract (mock-only, no financial authority).

**Release remains NO-GO.** No merge, deployment, database migration, spending, or policy adoption authorized.
