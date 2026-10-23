# NES-026 — Secure staging integration contract

NEO Energy now has a PostgreSQL **single-transaction role-isolation fixture** and a Node.js API-to-database adapter contract. The two are not connected by a real database driver: `lookupGrantAndRead` must still be implemented safely with a trusted verified-subject-to-tenant mapping.

The SQL integration fixture creates two disposable restricted database roles, RLS-protected grants/readings and an invoker-rights, read-only preview function. Tests use `SET LOCAL ROLE` in explicit transactions and demonstrate own-site access, cross-site/tenant denial, role reset and revocation.

The SQL fixture is NOT a customer session integration. It uses predefined test roles and does not demonstrate verified NEO Pass users mapped safely to pooled connections. The Node adapter verifies token signatures and claims via NES-023, but its database lookup is injected and not implemented by this gate.

Run in a disposable PostgreSQL 16 database:
`psql -v ON_ERROR_STOP=1 -f neo-energy/NES-026/staging.sql`
`psql -v ON_ERROR_STOP=1 -f neo-energy/NES-026/test_staging.sql`

## Blocking items
Real issuer energy-purpose tokens, non-privileged persistent DB app role, verified subject grants and connection-pool reset tests, audit and privacy review, authenticated HTTP/TLS service, customer dashboard hookup. Production utility functions remain disabled.
