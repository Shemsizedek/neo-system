# NES-015 — Customer Read-Only Interface and PostgreSQL Migration Design

Current release: **simulation-only backend service**, not an HTTP server or customer portal deployment.

## What exists
- `customer_service.py`: authorized site-scoped overview, importing NES-014 persistent simulation readings and NES-009 statement projection.
- `test_customer_service.py`: unit tests for authorized overview, absent identity, cross-site denial and missing tariffs.
- `postgres_schema.sql`: proposed PostgreSQL tables. Not applied to a database.

## Missing before any public deployment
- NEO Pass production issuer/JWKS configuration and verified JWT validation (issuer, audience, expiry, key rotation, replay/security policy).
- Server-maintained subject-to-site grants and revocation; never trust callers' verified_identity booleans or user-provided site lists.
- Tenant isolation via RLS or otherwise vetted SQL authorization, audit logging, encryption, monitoring, data retention and privacy policy.
- HTTP API with rate limiting and input schemas; complete accessible responsive customer/operator/engineer dashboards.
- Database migration rehearsals, backup/restore verification, concurrency/isolation checks and signed meter provenance.

No live energy meter, customer data, financial settlement or field dispatch is connected.
Run tests: `python -m unittest discover -s neo-energy/NES-015 -p 'test_*.py' -v`.
