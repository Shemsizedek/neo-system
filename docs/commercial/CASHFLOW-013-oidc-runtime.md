# CASHFLOW-013 — Authenticated Runtime Gate

OIDC verification module now checks RS256 signatures, JWKS key identity, exact issuer, audience, token expiry/issued-at, optional not-before and operator roles. JWKS retrieval is restricted to the configured HTTPS issuer origin. Connect only to a **trusted configured issuer**.

## Not yet operational
- No user-authorized identity issuer, audience or JWKS endpoint supplied.
- Existing Render creation tool provisions internet-facing web services only; no private gateway or private service provisioned.
- Neon application DATABASE_URL credentials not connected to protected hosting secrets.
- No live staging process, login, recovery, multi-worker test or production lead ingestion completed.
- The OIDC module is intended for review and test; security audit required before it protects user data.

## Certification sequence
1. Obtain approved OIDC provider and determine signed role claim mapping.
2. Validate JWT key rotation, unknown key behavior, expiration, malformed and oversized inputs, and resilience to remote JWKS failures. Audit trusted proxy headers.
3. Use identity-protected private hosting or verified gateway with rate limiting; never expose operator APIs to a generic public Render web endpoint.
4. Supply Neon database secrets through provider-managed secrets; do not print connection strings or commit them.
5. Run `node --test deploy/deal-desk-staging/*.test.mjs` and staged synthetic end-to-end tests.
6. Confirm authenticated 200, unauthenticated 401/403, restart recovery, duplicate control, logs without PII and fail-closed transaction policy.
7. Publish an operator-only URL only after external access checks pass.

Existing public `neo-deal-desk` proxy unchanged. Live payments, outreach and M&A remain disabled.
