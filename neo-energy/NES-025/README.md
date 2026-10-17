# NES-025 — Synthetic staging API contract and PostgreSQL grant isolation

NES-025 adds a Node.js request-route adapter wrapping NES-024 verified-simulation-token logic, plus PostgreSQL test scripts that exercise site permissions and revocation with separate restricted database roles.

The API adapter is not bound to an HTTP server, and its identity/token verifier still uses test-only HS256 material. PostgreSQL fixtures are intentionally **not connected to that adapter**: real cryptographic federation and a safe application/database identity mapping remain pending.

Test Node: `node --test neo-energy/NES-025/test-preview-api.mjs`.
CI runs PostgreSQL 16 with two disposable roles, isolated usage, and immediate revocation.

Critical unresolved prerequisites: live NEO Pass energy-scoped issuer/token issuance, real grants lookup using safely bound server-side verified subject and tenant, pooled-connection isolation, secure TLS/session and rate limiting, privacy/accessibility review, rollback, observability. No public release or money/grid control.
