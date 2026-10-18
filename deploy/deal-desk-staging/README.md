# CASHFLOW-008 — Isolated Staging Provisioning Gate

## Actual Render result
On 2026-10-18 attempted to create free PostgreSQL 18 in virginia named neo-deal-desk-staging. Render rejected creation: `cannot have more than one active free tier database`. **No new database exists.** Do not reuse Noogle or NEO Pads DB.

## Security staging design
1. Dedicated PostgreSQL service with isolated credentials, encryption, backups and retention rules. Requires explicit budget/plan authorization if paid.
2. True private network service or identity-protected gateway. Render create_web_service creates PUBLIC services, so do not use that tool for a private operator backend. Never treat a 'hidden' onrender URL as private.
3. OIDC issuer, audience and JWKS verified at runtime in service middleware; an environment flag does not itself establish authorization. No customer data endpoint until cryptographic verification and role checks are tested.
4. Enforce operator/service RBAC, distributed rate limiting, durable outbox, log redaction and TLS. Disable live transactions.
5. Dedicated test data only; test restart/durability, multi-worker deduplication, identity rejection, forged forwarded headers, proposal gates and rollback.
6. The included gate.mjs is a **fail-closed readiness stub**, not a complete authenticated staging environment. It has no database connection or end-to-end workflows. It binds localhost only and exposes healthz. Never deploy it publicly or count its environment checks as passing private network security.

## Blockers
- Render free-tier database quota exhausted.
- No approved paid database plan.
- No dedicated staging service provisioned.
- No verified private access gateway.
- No real staging integration tests executed.

Production remains unchanged, no payments or M&A enabled.
