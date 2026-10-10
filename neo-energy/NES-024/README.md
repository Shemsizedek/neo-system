# NES-024 — NEO Energy simulated authenticated preview composition

This gate creates a composable Node.js preview that chains the NES-023 cryptographic token validator with an injected site-grant function and synthetic usage projection.

Tests cover valid scoped access, cross-tenant denial, forged site claims, expired tokens, grant revocation, and missing server grant infrastructure.

**Important:** Tests use fabricated HS256 tokens and mocked authorization/reading functions. No real NEO Pass issuer or PostgreSQL pool is connected, and no public HTTP endpoint is deployed. Test claims do not establish real customer login.

The preview's `tenantId` and `siteId` are routing requests only; the external grants service must establish tenant/site ownership with authoritative server-side records and use parameterized SQL. `readingSummary` must independently enforce tenant isolation in the database.

Run: `node --test neo-energy/NES-024/test-energy-preview.mjs`.

Next required: approved NEO Pass token issuance with audience/token-use, real PostgreSQL transaction-scoped authorization, restricted staging server, session/cookie/CSRF defenses, independent security review and privacy controls.

No live billing, funds movement, customer data, remote utility dispatch or production merge.
