# Gate 41 — Tenant-Scoped Idempotency Isolation

**Status: Review-only / NO-GO.** No authenticated request binding, durable database, provider calls or deployment.

The mock registry stores records under a tenant namespace and idempotency key. Identical keys from distinct tenants remain independent. Lookups never search globally and only return a restricted copy of the attempt state. Missing tenant context fails closed.

## Critical production requirements

1. Derive the tenant from verified authentication and authorization middleware; never trust a tenant identifier supplied by the requester.
2. Scope database unique indexes to `(tenant_id, idempotency_key)`; use an opaque tenant identifier or keyed HMAC as approved by security.
3. Enforce row-level security or equivalent application-enforced isolation with independent authorization tests; a helper accepting arbitrary `authenticatedTenant` is not itself an authentication boundary.
4. Prevent cross-tenant disclosure through error differences, logs, metrics, support tools, cache keys, and timing where feasible.
5. Require transactional budget-account ownership checks for every reserve, read, settle, reconcile and replay operation.
6. Test tenant spoofing, key collisions, shared-key concurrency across separate workers, and operator/support roles against a real staging database.

**Next gate:** Gate 42 — Authenticated Tenant Context Boundary and Spoofing Tests.

**Release:** NO-GO pending human approval and real multi-tenant database validation.
