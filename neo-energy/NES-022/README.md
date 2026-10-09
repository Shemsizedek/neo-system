# NES-022 — Disposable PostgreSQL tenant-isolation experiment

This gate adds an **actual PostgreSQL role-and-RLS integration fixture** for GitHub Actions. The experiment uses database roles `nes_customer_a` and `nes_customer_b`; they are NOT NEO Pass identities and are never deployed to customer infrastructure.

### What is exercised
- Two independent sites/tenants in a fresh CI database.
- Database row-level security and grant-scoped site visibility.
- Cross-tenant negative reads for both roles.
- Restricted DML permissions.
- Revoked permissions no longer expose site readings.

### Critical boundary
The fixture intentionally uses `current_user` database roles, avoiding caller-supplied claims. It does **not** solve production identity federation or safe pooled-connection session contexts. Do not reuse schema/roles as a production migration. An actual staging environment requires least-privilege application roles, carefully verified NEO Pass issuer/audience/signatures and explicit tenant assignments.

### CI
`neo-energy-postgres-isolation.yml` runs a disposable PostgreSQL 16 container and psql scripts. No secrets for external servers or live accounts are required.

Production billing, electric switching, CES/NOMNI settlement, and real meter connections remain disabled. Even passing this CI does not authorize public access.
