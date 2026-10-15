# NSEC-099 — Noogle Connect device registry integration gate

This introduces **contracts and tests only**, not production device enrollment.

- `createDeviceRegistry` is deliberately not imported into the public Render HTTP server.
- `verifyIdentity` must be a server-controlled NEO Pass verifier that validates issuer, audience, expiration, replay conditions, session revocation and device-bound key possession. It must never trust browser-supplied user IDs or `assurance`.
- `proofVerified` is a privileged assertion supplied exclusively by a verified server-side cryptographic challenge verifier, **never accepted directly from HTTP request JSON**.
- Provide a durable, atomic, encrypted store implementation (with unique key-hash constraints and account-scoped revocation). The tests use an in-memory mock only.
- Require explicit approval with a fresh signed challenge, and document signing/voting and remote terminal remain separate authorization scopes disabled by default.
- Add rate limiting, audit trails, cross-worker concurrency and failure recovery before exposing registry endpoints.
- Existing staging pairing demonstration is unauthenticated, temporary and grants no real device permissions.

Deployment decision: **no endpoint activation and no credentials on Render** until these prerequisites are independently verified.
