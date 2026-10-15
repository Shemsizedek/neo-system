# NSEC-103 — Noogle Connect challenge certification

This gate adds an inactive, one-time challenge lifecycle with a PostgreSQL contract; no live registration or NEO Pass tokens are enabled.

- The trusted server must obtain `subject` from verified NEO Pass identity, never from posted JSON.
- Before issuance, enforce correct relying-party ID, registered HTTPS origin, allowed purpose, and per-account/device rate limits.
- For WebAuthn assertion verification, the bridge must supply an exact purpose/rpId/origin to `consume`; `webauthn-assertion.mjs` currently accepts a narrower callback and is **not wired into this service**.
- Issue registration challenges only after verified session authorization; parse and validate attestation, COSE credentials and authenticator properties with an audited WebAuthn implementation.
- Use PostgreSQL to atomically consume challenges; deploy migration via controlled, reviewed database operation with access controls, audit logs and cleanup.
- A successful challenge is not an enrolled device and does not permit document signing, voting or remote execution.
- Test cross-worker concurrency, replay races, compromised-client behavior, revocation and actual issuer interoperability before exposing HTTP endpoints.
