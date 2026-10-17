# NES-027 — Local staging HTTP and PostgreSQL integration

This gate introduces a local Node.js HTTP request handler and a disposable PostgreSQL schema for **synthetic energy data only**.

The server imports the NES-023 signed-session validator and is designed to use a PostgreSQL `pg` connection pool with a restricted database role. The SQL fixture grants the application role execution of a read-only, site-scoped database function rather than direct table access.

The server module does not start a network listener automatically. It has not been deployed, and the repository does not yet have a verified NES-027 end-to-end CI run. The authentication issuer is still a prototype rather than the production NEO Pass service.

**Before a release:** integrate a real energy-scoped NEO Pass issuer, run adversarial HTTP/database tests, verify grant revocation and restricted roles, establish TLS, protect credentials, conduct database privilege and SECURITY DEFINER review, and approve independent security evidence.

No live billing, settlement, public customer logins or electrical grid control are authorized.
