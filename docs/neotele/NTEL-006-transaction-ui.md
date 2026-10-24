# NTEL-006 — Database adapter and Chaplaincy member panel

Implemented a PostgreSQL-compatible transactional enrollment writer (enrollment + consent event + audit outbox) and a React member panel that consumes a trusted portal loader. Neither component is wired into a running API or public route yet. SQL migration from NTEL-005 has not been applied.

Security/release blockers: add real NEOpass bearer/cookie verification and CSRF middleware; mount endpoint safely; persist and query device/service registry; prevent public service enumeration; implement valid policy-version allowlist and rate limiting. Existing HTTP enrollment handler records consent via an independent adapter before enrollment; it must be replaced by the atomic store to avoid split writes. Authorized provider directory, Lifeline eligibility decisions and eSIM activation still require external carrier integration.

Run `node --test server/neotele/*.test.mjs` and the normal application build. Keep PR draft until verified.
