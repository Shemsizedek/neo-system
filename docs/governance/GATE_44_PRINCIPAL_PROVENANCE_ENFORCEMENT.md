# Gate 44 — Principal Provenance Enforcement

**Decision: REVIEW-ONLY / NO-GO.** No live authentication, routes, database or provider invocation are changed.

## Gate 43 regression discovered and corrected

Gate 43 CI run 39994662026 failed because the principal factory's `minted` WeakSet was module-global. A second factory erroneously attested a first factory's principal. Gate 43 was corrected on its own branch (commit `95ee5f62e1aa37deed0eaa0210f4a26155176586`) by making the WeakSet factory-local. Gate 44 is stacked on that correction.

## Contract change

The old `resolveAuthenticatedTenant({verifiedPrincipal,...})` accepted any object containing `verified: true`, a spoofable flag. Gate 44 **replaces** that API with `createAuthenticatedTenantResolver(principalFactory)`, which captures one factory attestor during trusted server initialization. The resulting resolver rejects a principal unless `principalFactory.isMinted(principal) === true`, in addition to the existing verified/subject/tenant validation and direct tenant override checks. There is no implicit permissive or fallback resolver.

Regression tests reject copied/frozen principal objects, forged `verified: true` flags, principals minted by a different factory, and failing/throwing attestors. Tenant-resolution tests have been migrated to the new API.

## Important security limits

- The principal factory and verifier callback are still mock-only dependency injection. A malicious or overly permissive verifier can mint arbitrary identities, and a malicious factory with `isMinted: () => true` can subvert the construction-time trust boundary. The server must construct the factory exclusively in a private, trusted module.
- This does NOT verify signatures, issuer, audience, expiration, revocation or tenant membership. Tokens and HTTP routes are not integrated.
- The tenant registry remains in-memory; direct calls to its functions still accept a string tenant and are not protected by the resolver. A production ledger must bind authorized tenant identity at every operation.
- Existing untrusted-field checks reject specified top-level tenant aliases but do not promise comprehensive nested field or parameter-pollution protection.
- A passed CI suite proves mock contracts, not staging HTTP authorization or production readiness.

## Acceptance required before live use

1. Select and audit the actual authentication provider and tenant-membership data source.
2. Instantiate a private principal factory from authenticated, revocation-aware server middleware.
3. Ensure every ledger operation accepts only internal resolved tenant context rather than raw client tenant IDs.
4. Run red-team spoofing, concurrent tenant, revoked token, cross-service and real database tests on staging.
5. Obtain security, privacy, budget and release approval.

**Next gate:** Gate 45 — Server-Only Attestor Binding and Ledger-Operation Context Contract (review-only).

No merge, deployment, database migration, spending or policy adoption.
