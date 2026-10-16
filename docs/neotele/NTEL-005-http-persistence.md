# NTEL-005 — NeoTele authenticated HTTP boundary and persistence schema

Added an **unmounted** HTTP handler abstraction with GET portal, GET verified provider directory and POST enrollment, plus Node tests. Sessions must be resolved by trusted NEOpass backend adapters; mutation requires upstream origin verification and explicit consent version. Provider directory excludes any entry lacking authoritative verified/authorized flags. Eligibility or coverage is never inferred from ZIP alone.

The PostgreSQL schema is a proposed migration only, not applied. Enforce unique subject/idempotency key and atomic saving of enrollment, consent and audit outbox in a single transaction; current injected handlers do NOT provide this guarantee. Add CSRF/session cookie binding, request size limits, rate limiting, durable consent-before-request transaction, RLS, provider contract attestations, and real NEOpass/CRM/Guardian adapters before mounting. Avoid accepting consent versions from arbitrary clients without an allowlisted policy version.

No provider, Lifeline program connection, real eSIM, SMS number, live web UI, or activation has been enabled.

Tests: `node --test server/neotele/*.test.mjs`.
Next: NTEL-006 implement transaction-backed adapters with outbox/consent semantics, typed HTTP integration and member front-end, followed by independent security review.
