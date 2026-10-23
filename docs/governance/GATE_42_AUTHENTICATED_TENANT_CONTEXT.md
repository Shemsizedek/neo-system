# Gate 42 — Authenticated Tenant Context Contract

**Status: REVIEW-ONLY / NO-GO.** This module does not authenticate callers, verify JWTs, bind to middleware, or protect live routes.

`resolveAuthenticatedTenant` accepts a server-supplied `verifiedPrincipal` and rejects tenant overrides in request body, query or headers. Tests cover missing/unverified principals and obvious spoofing attempts.

**Trust boundary warning:** The `verified: true` flag is only a mock contract marker, not cryptographic proof. If callers can construct or influence `verifiedPrincipal`, this control is bypassable. A production implementation must derive immutable principal context inside trusted middleware after token signature/audience/issuer/expiry verification and map it to authorized tenant membership. Never accept principal objects from JSON or untrusted headers.

## Required hardening before integration

- Resolve authenticated identity from actual provider or operator credential and explicitly bind authorized tenant membership.
- Use a private server-only principal channel inaccessible to user-controlled request data.
- Reject alternate header aliases, nested tenant fields and parameter pollution at the HTTP parsing boundary.
- Authorize every ledger operation and budget-account ID against the tenant, not only the idempotency lookup.
- Test malformed credentials, privilege escalation, cross-tenant access, token revocation, operator scope and request smuggling in staging.
- Keep existing security policy and deployment NO-GO until approved.

**Next gate:** Gate 43 — Trusted Principal Factory and Tamper-Resistance Contract (mock-only).

No merge, migration, deployment or spending performed.
