# NES-028 — Recovery and security evidence for NES-027

The NES-027 HTTP service source exists, but its end-to-end verification was previously interrupted. This gate adds a local HTTP contract test with an injected in-memory database adapter and a PostgreSQL privilege-check script against the disposable NES-027 schema.

Tests cover signed access, cross-site denial, absent/invalid tokens, rejected writes, fixed response flags, parameter binding, restricted API privileges and scoped database function behavior.

**Limitation:** The local HTTP test uses a fake pool rather than a live PostgreSQL driver. The SQL privilege test is independent. It does not yet establish one integrated HTTP-to-database execution test, real NEO Pass federation or safe production deployment.

Run the HTTP test using an isolated Node 22 environment with the npm pg driver accessible to NES-027/server.mjs. Run the SQL script after creating the NES-027 fixture in disposable PostgreSQL 16.

Do not deploy the test server, customer data, production credentials, token settlement or electrical controls.
