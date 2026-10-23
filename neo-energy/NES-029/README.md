# NES-029 — Actual HTTP → PostgreSQL synthetic end-to-end test

Provides a full local test against disposable PostgreSQL 16 with a restricted application role, signing-key test fixture, localhost HTTP service, and database grant/revocation enforcement.

The test starts the NES-027 server, sends signed fabricated customer tokens, confirms only scoped sites can be read, denies cross-tenant access, rejects missing/expired tokens, updates a grant through the disposable administrator connection, and verifies immediate denial on subsequent requests.

No production NEO Pass token issuer, account, live meter, public HTTP listener, billing system or physical controller is connected.

Run in disposable environment: install `pg@8` in `neo-energy/NES-027`, create the NES-027 schema, run `node --test neo-energy/NES-029/test-e2e.mjs`.

## Before a staging customer preview
Reviewed restricted database function and key rotation/revocation; verified production NEO Pass audience/purpose issuer; TLS, rate limiting and abuse controls; database migrations and backup restoration; safe connection pooling; privacy assessment and human approval.
