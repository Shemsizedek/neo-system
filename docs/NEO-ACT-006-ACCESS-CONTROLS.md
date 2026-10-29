# NEO-ACT-006 — Treasury read-only access contract

Status: draft development code only; **not** an operational authenticated service.

The new `authorizePrincipal` check requires an upstream-authenticated subject, unexpired session, named Treasury role and explicit read scope. `guardedRiskProjection` returns a reduced reporting view without customer account detail or transaction-level rows.

## Important security boundary
The code **does not authenticate** a bearer token, verify an OAuth/OIDC signature, validate trusted issuer/audience, manage sessions or provide network endpoints. The caller-supplied principal must come from a trusted, independently validated identity middleware, and the `expiresAt` comparison uses runtime clock. These checks cannot be exposed directly to untrusted clients.

The dashboard is a **data contract**, not a deployed interface. No source adapter has been connected to CES, Counterparty or Crown Chain. Existing evidence classification flags remain upstream assertions. Production must fail closed on signature verification, identity provider trust, tenant isolation, TLS, audit trails, quotas and denial-case testing.

## Next gate: NEO-ACT-007
Implement server-side verified identity adapter and permission-scoped endpoint, signed source envelopes, immutable evidence store, replay protections, independent blockchain proof adapters, end-to-end integration tests, and security review. No signing keys, settlement, issuance or transfer operations.
