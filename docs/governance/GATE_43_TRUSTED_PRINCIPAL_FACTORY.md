# Gate 43 — Trusted Principal Factory Contract

**Status: REVIEW-ONLY / NO-GO.** The factory is not wired into HTTP authentication or a credential issuer.

The `createPrincipalFactory(verifyIdentity)` contract accepts a caller-supplied verification callback, creates a frozen null-prototype principal from its validated identity, and records its provenance in a private WeakSet. Tests demonstrate that copied or forged principal objects do not pass `factory.isMinted`, and that separate factories cannot attest each other's objects.

## Security limits

- A caller that can supply a permissive `verifyIdentity` callback can mint a principal. Only trusted server initialization may configure this callback.
- Gate 42's `resolveAuthenticatedTenant` still trusts `verified: true`; it does not currently call `factory.isMinted`. Therefore Gate 43's provenance check is not an enforced route authorization boundary.
- A frozen object prevents ordinary mutation of top-level fields but does not prove token validity, tenant membership, or authorization.
- Production authentication must verify cryptographic token signature, issuer, audience, expiration, revocation and tenant membership, and bind principal provenance inside private server-only middleware.
- Never deserialize a principal from JSON or trust request-provided `verified`, `tenantId`, `subject`, or equivalent fields.
- Test privilege escalation, forged identity, compromised verifier configuration, cross-tenant ledger operations and service restart behavior before staging.

**Next gate:** Gate 44 — Bind Provenance Verification to Tenant Resolution (pure mock integration, no live routes).

No merge, deployment, migration or financial commitment performed.
