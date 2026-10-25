# Gate 45 — Server-Only Attestor Binding and Ledger Operation Context

**Status: REVIEW-ONLY / NO-GO.** This gate adds a pure mock capability wrapper, tests and contract guidance. No live HTTP routes, authenticators, persistent databases, provider calls or billing controls were modified.

## Verified parent

Gate 44 commit `dae214ec9d415efcf6afda87f481189afb32ef7c` passed CI run `39998772643`. Its `createAuthenticatedTenantResolver(principalFactory)` rejects principals that were not minted by the captured factory.

## Design

`createServerBoundTenantLedger({principalFactory, registry})` is instantiated by **trusted server initialization only**. It captures the principal attestor and private ledger registry. Calling `bind({verifiedPrincipal, requestBody, requestQuery, requestHeaders})` requires factory provenance and rejects the currently recognized explicit tenant override fields.

A successful bind returns frozen `operations.reserve({key,attempt})` and `operations.lookup({key})` functions. These operations close over the authenticated tenant and never accept an `authenticatedTenant` or `tenantId` parameter. The `attempt` contract accepts only `{state:'reserved'}`; raw ledger metadata is not exposed. Reject unexpected operation fields instead of quietly honoring or forwarding tenant overrides. Failed binding returns no capability. Registry failures use a generic `ledger_unavailable` response.

Tests cover independent same-key reservations across tenants, no cross-tenant reads, fake/copy/foreign-factory principals, body/query/header tenant overrides, attempted operation-level tenant injection, mutable caller inputs, backend errors, and required dependencies.

## Trust boundary and release blockers

1. This wrapper is **NOT** a production authorization boundary. Anyone given the raw `registry` can call its mock methods with an arbitrary tenant; never export raw access from trusted server code.
2. A bound `operations` object is a bearer capability. Only trusted server middleware may create, retain or invoke it; never serialize it, persist it, leak it to a client, or reuse it across principals.
3. `principalFactory` and its verifier callback are dependency injection, **not real credential validation**. A permissive verifier or injected attestor can fabricate authorization. Bind to privately initialized and auditable authentication code, enforce current tenant membership, token expiry, revocation and role scope.
4. Recognized override fields are not an exhaustive HTTP-smuggling defense; validate header aliases, duplicate parameters, nested tenant fields, path tenant IDs, and resource IDs before route integration.
5. Registry remains process-local. It does not enforce durable budgets, reservation uniqueness across processes, quota enforcement, transaction isolation, reconciliation evidence, or protected result storage.
6. All ledger entry points (including start, settle, mark unknown, reconcile, snapshot and administrative actions) must eventually enforce tenant-scoped resource ownership; Gate 45 mock wrapper exposes **only reserve and lookup**.
7. Add tests against a real identity provider integration, multiple workers, crash/restart, database row-level security (or equivalent), and negative cross-tenant resource access.
8. Security, privacy, finance and deployment approvals remain pending.

## Acceptance criteria

- No client-supplied tenant identity enters the registry through the bound reserve/lookup contract.
- Unattested principals never receive bound ledger operations.
- Distinct tenants can reuse an identical idempotency key without collision or disclosure.
- Exceptions and unavailable storage deny rather than grant access.
- CI passes on a draft review branch; no merge or deployment.

**Next gate:** Gate 46 — Server-Side Resource Ownership Checks for All Ledger State Transitions (mock-only).

**Release decision:** NO-GO. No merge, deployment, migration, billing changes or external commitments approved.
