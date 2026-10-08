# NES-020 PostgreSQL isolation validation plan

This is NOT an executable production migration or an attestation of security.

## Required staging tests
1. Use an actual PostgreSQL instance with distinct database owner, migration role, app role, and test customer roles; prohibit BYPASSRLS for customer/app roles.
2. Enable and FORCE RLS for site/readings tables. Confirm grant lookup is implemented in a carefully audited function or authorization service with no publicly readable grant records.
3. Bind verified session context using `SET LOCAL` inside a single transaction after server authentication; validate that pooled connections reset context and cannot retain previous-tenant privileges.
4. Attempt cross-tenant and cross-site reads, forged custom GUCs, revoked grants, expired grants, and direct table access. Confirm all fail.
5. Require a live NEO Pass test issuer with mandatory signature, issuer, audience, expiry, token_use checks and key rotation behavior.
6. Verify database backups and actual restore exercises, audit integrity, request tracing, rate limiting and secret rotation.
7. Capture signed test artifacts and require independent security review before any authenticated preview.

The previously drafted NES-019 RLS policy is an illustrative starting point; it is not proven safe against session-context forgery until roles and connection pooling are validated.
